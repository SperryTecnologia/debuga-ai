/**
 * Local authentication (email + password) for debuga.ai.
 * Supports bcrypt password hashing, rate limiting, and ADMIN_EMAIL auto-promote.
 */
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";
import { isDisposableEmail, isValidEmailFormat, createVerificationToken, sendVerificationEmail } from "./emailVerification";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

// ── Rate limiting for login attempts ──
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  const elapsed = Date.now() - entry.lastAttempt;
  if (elapsed > LOCKOUT_DURATION_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(key: string): void {
  const entry = loginAttempts.get(key);
  if (!entry) {
    loginAttempts.set(key, { count: 1, lastAttempt: Date.now() });
  } else {
    entry.count++;
    entry.lastAttempt = Date.now();
  }
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(loginAttempts.entries())) {
    if (now - entry.lastAttempt > LOCKOUT_DURATION_MS * 2) {
      loginAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000);

// ── Cloudflare Turnstile CAPTCHA verification ──
async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const secret = ENV.turnstileSecretKey;
  if (!secret) return true; // Skip if not configured

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp,
      }).toString(),
    });

    const data = await response.json() as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[Turnstile] Verification error:", err);
    return false; // Fail closed
  }
}

// ── Account lockout constants ──
const MAX_FAILED_ATTEMPTS_DB = 10; // Persistent lockout after this many
const DB_LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

// ── Password utilities ──
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos uma letra maiúscula." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos uma letra minúscula." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos um número." };
  }
  return { valid: true };
}

// ── Determine if user should be admin ──
function shouldBeAdmin(email: string): boolean {
  if (!ENV.adminEmail) return false;
  return email.toLowerCase().trim() === ENV.adminEmail.toLowerCase().trim();
}

// ── Register local auth routes ──
export function registerLocalAuthRoutes(app: Express) {
  // ENABLE_LOCAL_LOGIN (official) with ENABLE_LOCAL_AUTH as legacy alias
  const isEnabled = ENV.enableLocalLogin;

  if (!isEnabled) {
    console.log("[LocalAuth] Local login disabled (ENABLE_LOCAL_LOGIN=false)");
    return;
  }

  console.log("[LocalAuth] Local login enabled");

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/local/register — Create a new local account
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/local/register", async (req: Request, res: Response) => {
    try {
      console.log("[LocalAuth] Register request received");
      const { name, email, password, phone, acceptTerms, turnstileToken } = req.body;

      console.log(`[LocalAuth] Turnstile token present: ${!!turnstileToken}`);

      if (!email || !password) {
        res.status(400).json({ error: "E-mail e senha são obrigatórios." });
        return;
      }

      if (!name || name.trim().length < 2) {
        res.status(400).json({ error: "Nome é obrigatório (mínimo 2 caracteres)." });
        return;
      }

      // Validate email format
      if (!isValidEmailFormat(email)) {
        res.status(400).json({ error: "Formato de e-mail inválido." });
        return;
      }

      // Block disposable emails
      if (isDisposableEmail(email)) {
        res.status(400).json({ error: "E-mails temporários/descartáveis não são permitidos." });
        return;
      }

      // Validate password strength
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        res.status(400).json({ error: passwordCheck.message });
        return;
      }

      // Validate terms acceptance (if required)
      if (ENV.requireTermsAcceptance && !acceptTerms) {
        res.status(400).json({ error: "É necessário aceitar os Termos de Uso e Política de Privacidade." });
        return;
      }

      // Verify Turnstile CAPTCHA (if configured and token provided)
      if (ENV.turnstileSecretKey && ENV.enableTurnstile) {
        if (turnstileToken) {
          const captchaValid = await verifyTurnstile(turnstileToken, req.ip || "");
          if (!captchaValid) {
            console.warn("[LocalAuth] Turnstile verification failed");
            res.status(400).json({ error: "Não foi possível concluir a verificação de segurança. Tente novamente." });
            return;
          }
          console.log("[LocalAuth] Turnstile verified OK");
        } else if (ENV.turnstileSiteKey) {
          res.status(400).json({ error: "Complete a verificação de segurança (CAPTCHA)." });
          return;
        }
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if email already exists
      const existingUser = await db.getUserByEmail(normalizedEmail);
      if (existingUser) {
        res.status(409).json({ error: "Este e-mail já está cadastrado. Tente fazer login." });
        return;
      }

      // Hash password
      console.log("[LocalAuth] Hashing password...");
      const passwordHash = await hashPassword(password);
      console.log("[LocalAuth] Password hash OK");

      // Determine role
      const role = shouldBeAdmin(normalizedEmail) ? "admin" : "user";

      // Create user
      console.log(`[LocalAuth] Creating user: ${normalizedEmail} (role: ${role})`);
      const newUser = await db.createLocalUser({
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role,
      });
      console.log(`[LocalAuth] User created OK: id=${newUser.id}`);

      // Save phone and terms acceptance
      const dbConn = await db.getDb();
      if (dbConn) {
        const updateData: Record<string, any> = {};
        if (phone) updateData.phone = phone.trim();
        if (acceptTerms) {
          updateData.termsAcceptedAt = new Date();
          updateData.privacyAcceptedAt = new Date();
        }
        if (Object.keys(updateData).length > 0) {
          await dbConn.update(users).set(updateData).where(eq(users.id, newUser.id));
        }
      }

      // Create session token
      console.log("[LocalAuth] Creating session token...");
      const sessionToken = await sdk.createSessionToken(newUser.openId, {
        name: newUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log("[LocalAuth] Session cookie set OK");

      // Send verification email (non-blocking)
      if (ENV.emailVerificationEnabled) {
        createVerificationToken(newUser.id, "email").then(async (result) => {
          if (result) {
            const settings = await db.getAppSettings();
            const appName = settings?.appName || "debuga.ai";
            await sendVerificationEmail(normalizedEmail, result.code, appName);
          }
        }).catch((err) => {
          console.error("[LocalAuth] Failed to send verification email:", err);
        });
      }

      // Audit log
      await db.createAuditLog({
        userId: newUser.id,
        action: "register_local",
        entityType: "user",
        entityId: newUser.id,
        metadata: { email: normalizedEmail, role, phone: phone || null, termsAccepted: !!acceptTerms },
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      });

      console.log(`[LocalAuth] New user registered: ${normalizedEmail} (role: ${role})`);

      res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          emailVerified: false,
        },
        requiresEmailVerification: ENV.emailVerificationEnabled,
      });
    } catch (err: any) {
      console.error("[LocalAuth] Register error:", err.message || err);
      console.error("[LocalAuth] Register error stack:", err.stack);
      if (err.code === "23505") {
        res.status(409).json({ error: "Este e-mail já possui uma conta. Tente entrar ou recuperar sua senha." });
        return;
      }
      if (err.message?.includes("Database connection unavailable") || err.message?.includes("Database not available")) {
        res.status(503).json({ error: "Não foi possível criar sua conta agora. Nossa equipe já pode analisar o erro pelos registros internos." });
        return;
      }
      res.status(500).json({ error: "Não foi possível criar sua conta agora. Tente novamente em instantes." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/local/login — Login with email + password
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/local/login", async (req: Request, res: Response) => {
    try {
      console.log("[LocalAuth] Login request received");
      const { email, password, turnstileToken } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "E-mail e senha são obrigatórios." });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const rateLimitKey = normalizedEmail;

      // Check in-memory rate limit
      if (isRateLimited(rateLimitKey)) {
        res.status(429).json({
          error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
        });
        return;
      }

      // Verify Turnstile CAPTCHA on login (if configured and enabled)
      if (ENV.turnstileSecretKey && ENV.turnstileOnLogin && ENV.enableTurnstile) {
        if (turnstileToken) {
          const captchaValid = await verifyTurnstile(turnstileToken, req.ip || "");
          if (!captchaValid) {
            res.status(400).json({ error: "Falha na verificação CAPTCHA. Tente novamente." });
            return;
          }
        } else if (ENV.turnstileSiteKey) {
          // Site key configured but no token sent
          res.status(400).json({ error: "Complete a verificação de segurança (CAPTCHA)." });
          return;
        }
      }

      // Find user by email
      const user = await db.getUserByEmail(normalizedEmail);

      if (!user || !user.passwordHash) {
        recordLoginAttempt(rateLimitKey);
        res.status(401).json({ error: "E-mail ou senha inválidos." });
        return;
      }

      // Check persistent lockout (DB-level)
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMin = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
        res.status(423).json({
          error: `Conta bloqueada por excesso de tentativas. Tente novamente em ${remainingMin} minutos.`,
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        recordLoginAttempt(rateLimitKey);
        res.status(403).json({ error: "Conta desativada. Contate o administrador." });
        return;
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        recordLoginAttempt(rateLimitKey);

        // Track persistent failed attempts in DB
        const dbConn = await db.getDb();
        if (dbConn) {
          const newAttempts = (user.failedLoginAttempts || 0) + 1;
          const updateData: Record<string, any> = { failedLoginAttempts: newAttempts };
          if (newAttempts >= MAX_FAILED_ATTEMPTS_DB) {
            updateData.lockedUntil = new Date(Date.now() + DB_LOCKOUT_DURATION_MS);
            console.warn(`[LocalAuth] Account locked: ${normalizedEmail} (${newAttempts} failed attempts)`);
          }
          await dbConn.update(users).set(updateData).where(eq(users.id, user.id));
        }

        res.status(401).json({ error: "E-mail ou senha inválidos." });
        return;
      }

      // Success - clear rate limit and failed attempts
      clearLoginAttempts(rateLimitKey);
      const dbConn = await db.getDb();
      if (dbConn) {
        await dbConn.update(users).set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastSignedIn: new Date(),
          updatedAt: new Date(),
        }).where(eq(users.id, user.id));
      }

      // Check if should be promoted to admin (in case ADMIN_EMAIL was set after registration)
      if (shouldBeAdmin(normalizedEmail) && user.role !== "admin") {
        await db.promoteToAdmin(user.id);
        user.role = "admin";
        console.log(`[LocalAuth] Auto-promoted ${normalizedEmail} to admin (ADMIN_EMAIL match)`);
      }

      // Create session
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Log audit
      await db.createAuditLog({
        userId: user.id,
        action: "login_local",
        entityType: "user",
        entityId: user.id,
        metadata: { email: normalizedEmail },
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified ?? false,
        },
      });
    } catch (err: any) {
      console.error("[LocalAuth] Login error:", err.message || err);
      console.error("[LocalAuth] Login error stack:", err.stack);
      if (err.message?.includes("Database connection unavailable") || err.message?.includes("Database not available")) {
        res.status(503).json({ error: "Serviço temporário indisponível. Tente novamente em instantes." });
        return;
      }
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/local/logout — Clear session cookie
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/local/logout", async (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.json({ success: true });
    } catch (err) {
      console.error("[LocalAuth] Logout error:", err);
      res.status(500).json({ error: "Erro ao encerrar sessão." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/auth/me — Return current session user (works for both OAuth and local)
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado.", user: null });
        return;
      }
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider || "google",
        },
      });
    } catch (err) {
      // Clear stale/invalid cookie so browser stops sending it
      if ((req as any).__invalidSession) {
        const cookieOptions = getSessionCookieOptions(req);
        res.clearCookie(COOKIE_NAME, cookieOptions);
      }
      res.status(401).json({ error: "Sessão inválida.", user: null });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/local/change-password — Change password for local users
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/local/change-password", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado." });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Senha atual e nova senha são obrigatórias." });
        return;
      }

      const passwordCheck = validatePassword(newPassword);
      if (!passwordCheck.valid) {
        res.status(400).json({ error: passwordCheck.message });
        return;
      }

      // Get user from DB to verify current password
      const dbUser = await db.getUserByEmail(user.email!);
      if (!dbUser || !dbUser.passwordHash) {
        res.status(400).json({ error: "Conta não usa autenticação local." });
        return;
      }

      const isValid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Senha atual incorreta." });
        return;
      }

      const newHash = await hashPassword(newPassword);
      await db.updateUserPassword(dbUser.id, newHash);

      await db.createAuditLog({
        userId: dbUser.id,
        action: "change_password",
        entityType: "user",
        entityId: dbUser.id,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      });

      res.json({ success: true });
    } catch (err) {
      console.error("[LocalAuth] Change password error:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/auth/config — Returns which auth methods are enabled
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    res.json({
      googleOAuth: ENV.enableGoogleOAuth && !!ENV.googleClientId,
      localLogin: ENV.enableLocalLogin,
    });
  });
}
