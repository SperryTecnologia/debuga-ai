/**
 * Email Verification Module for debuga.ai
 * 
 * Handles:
 * - Token generation and hashing
 * - SMTP email sending (with dev-mode console fallback)
 * - Verification and resend endpoints
 * - Disposable email domain blocking
 */
import crypto from "crypto";
import nodemailer from "nodemailer";
import type { Express, Request, Response } from "express";
import { eq, and, isNull, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { ENV } from "./_core/env";
import { buildVerificationEmailHtml, buildPasswordResetEmailHtml, buildWelcomeEmailHtml } from "./emailTemplates";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { authVerificationTokens, users } from "../drizzle/schema";

// ── Constants ──
const TOKEN_EXPIRY_MINUTES = 30;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between resends
const MAX_TOKENS_PER_HOUR = 5;

// ── Disposable email domain list (top offenders) ──
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "throwaway.email", "guerrillamail.com", "guerrillamail.net",
  "mailinator.com", "yopmail.com", "10minutemail.com", "trashmail.com",
  "fakeinbox.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "maildrop.cc", "mailnesia.com", "tempail.com",
  "temp-mail.org", "temp-mail.io", "emailondeck.com", "getnada.com",
  "mohmal.com", "burnermail.io", "inboxkitten.com", "harakirimail.com",
  "jetable.org", "throwawaymail.com", "tmpmail.net", "tmpmail.org",
  "tempr.email", "discard.email", "discardmail.com", "discardmail.de",
  "spamgourmet.com", "mytemp.email", "mt2015.com", "emailfake.com",
  "crazymailing.com", "tmail.ws", "moakt.ws", "mailcatch.com",
]);

// ── Token utilities ──
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Email validation ──
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

export function isValidEmailFormat(email: string): boolean {
  // RFC 5322 simplified
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email) && email.length <= 320;
}

// ── SMTP Transport ──
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = ENV.smtpHost;
  const port = ENV.smtpPort;
  const user = ENV.smtpUser;
  const pass = ENV.smtpPass;

  if (!host || !user || !pass) {
    console.warn("[EmailVerification] SMTP not configured — emails will be logged to console (dev mode)");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: port || 587,
    secure: ENV.smtpSecure || port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  // Verify SMTP connection on first use (non-blocking)
  transporter.verify().then(() => {
    console.log(`[EmailVerification] SMTP connected: ${host}:${port} (user: ${user.slice(0, 4)}...)`);
  }).catch((err: any) => {
    console.error(`[EmailVerification] SMTP connection failed: ${err.message}`);
    console.error(`[EmailVerification] Check SMTP_HOST=${host}, SMTP_PORT=${port}, credentials`);
    // Reset transporter so next attempt retries
    transporter = null;
  });

  return transporter;
}

// ── Send verification email ──
async function sendVerificationEmail(
  to: string,
  code: string,
  appName: string,
  verifyUrl?: string
): Promise<boolean> {
  const transport = getTransporter();
  const fromName = appName || "debuga.ai";
  const fromEmail = ENV.smtpFrom || ENV.smtpUser || "noreply@debuga.ai";

  const subject = `${fromName} \u2014 C\u00f3digo de verifica\u00e7\u00e3o: ${code}`;
  const html = buildVerificationEmailHtml(code, fromName, TOKEN_EXPIRY_MINUTES, verifyUrl);

  if (!transport) {
    // Dev mode: log to console
    console.log("═══════════════════════════════════════════════════════");
    console.log(`[EmailVerification] DEV MODE — Email would be sent to: ${to}`);
    console.log(`[EmailVerification] Subject: ${subject}`);
    console.log(`[EmailVerification] Code: ${code}`);
    if (verifyUrl) console.log(`[EmailVerification] Verify URL: ${verifyUrl}`);
    console.log("═══════════════════════════════════════════════════════");
    return true; // Simulate success in dev mode
  }

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    console.log(`[EmailVerification] Verification email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[EmailVerification] Failed to send email:", err);
    return false;
  }
}

// ── Password reset email ──
async function sendPasswordResetEmail(
  to: string,
  code: string,
  appName: string
): Promise<boolean> {
  const transport = getTransporter();
  const fromName = appName || "debuga.ai";
  const fromEmail = ENV.smtpFrom || ENV.smtpUser || "noreply@debuga.ai";

  const subject = `${fromName} \u2014 Redefini\u00e7\u00e3o de senha`;
  const html = buildPasswordResetEmailHtml(code, fromName, TOKEN_EXPIRY_MINUTES);

  if (!transport) {
    console.log("═══════════════════════════════════════════════════════");
    console.log(`[EmailVerification] DEV MODE — Password reset email to: ${to}`);
    console.log(`[EmailVerification] Code: ${code}`);
    console.log("═══════════════════════════════════════════════════════");
    return true;
  }

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[EmailVerification] Failed to send password reset email:", err);
    return false;
  }
}

// ── Database helpers for verification tokens ──
async function createVerificationToken(
  userId: number,
  type: "email" | "phone" | "password_reset"
): Promise<{ token: string; code: string } | null> {
  const dbConn = await db.getDb();
  if (!dbConn) return null;

  // Rate limit: max tokens per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTokens = await dbConn
    .select()
    .from(authVerificationTokens)
    .where(
      and(
        eq(authVerificationTokens.userId, userId),
        eq(authVerificationTokens.type, type),
        gt(authVerificationTokens.createdAt, oneHourAgo)
      )
    );

  if (recentTokens.length >= MAX_TOKENS_PER_HOUR) {
    return null; // Rate limited
  }

  const code = generate6DigitCode();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Store the code hash (we use the 6-digit code as the primary verification method)
  const codeHash = hashToken(code);

  await dbConn.insert(authVerificationTokens).values({
    userId,
    type,
    tokenHash: codeHash,
    expiresAt,
  });

  return { token, code };
}

async function verifyToken(
  userId: number,
  code: string,
  type: "email" | "phone" | "password_reset"
): Promise<boolean> {
  const dbConn = await db.getDb();
  if (!dbConn) return false;

  const codeHash = hashToken(code);
  const now = new Date();

  const tokens = await dbConn
    .select()
    .from(authVerificationTokens)
    .where(
      and(
        eq(authVerificationTokens.userId, userId),
        eq(authVerificationTokens.type, type),
        eq(authVerificationTokens.tokenHash, codeHash),
        isNull(authVerificationTokens.usedAt),
        gt(authVerificationTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (tokens.length === 0) return false;

  // Mark token as used
  await dbConn
    .update(authVerificationTokens)
    .set({ usedAt: now })
    .where(eq(authVerificationTokens.id, tokens[0].id));

  return true;
}

// ── Resend cooldown tracking (in-memory) ──
const resendCooldowns = new Map<string, number>();

function canResend(key: string): boolean {
  const lastSent = resendCooldowns.get(key);
  if (!lastSent) return true;
  return Date.now() - lastSent > RESEND_COOLDOWN_MS;
}

function markResent(key: string): void {
  resendCooldowns.set(key, Date.now());
}

// ── Register verification routes ──
export function registerEmailVerificationRoutes(app: Express) {
  const appSettings = db.getAppSettings;

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/verify-email — Verify email with 6-digit code
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    console.log(`[EmailVerification] verify-email route HIT, body keys: ${Object.keys(req.body || {}).join(",")}, cookie present: ${!!req.headers.cookie?.includes("app_session_id")}`);
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch (authErr: any) {
        console.error("[EmailVerification] Verify auth failed:", authErr?.message || authErr);
        res.status(401).json({ error: "N\u00e3o autenticado. Fa\u00e7a login novamente." });
        return;
      }
      if (!user) {
        res.status(401).json({ error: "N\u00e3o autenticado." });
        return;
      }

      const { code } = req.body;
      if (!code || code.length !== 6) {
        res.status(400).json({ error: "Código de verificação inválido." });
        return;
      }

      const isValid = await verifyToken(user.id, code, "email");
      if (!isValid) {
        res.status(400).json({ error: "Código inválido ou expirado. Solicite um novo código." });
        return;
      }

      // Mark email as verified
      const dbConn = await db.getDb();
      if (dbConn) {
        await dbConn
          .update(users)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      await db.createAuditLog({
        userId: user.id,
        action: "email_verified",
        entityType: "user",
        entityId: user.id,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      });

      console.log(`[EmailVerification] Email verified for user ${user.id} (${user.email})`);
      res.json({ success: true, message: "E-mail verificado com sucesso!" });
    } catch (err) {
      console.error("[EmailVerification] Verify error:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/resend-verification — Resend verification code
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    console.log(`[EmailVerification] resend-verification route HIT, cookie present: ${!!req.headers.cookie?.includes("app_session_id")}`);
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch (authErr: any) {
        console.error("[EmailVerification] Resend auth failed:", authErr?.message || authErr);
        res.status(401).json({ error: "N\u00e3o autenticado. Fa\u00e7a login novamente." });
        return;
      }
      if (!user) {
        res.status(401).json({ error: "N\u00e3o autenticado." });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({ error: "E-mail já verificado." });
        return;
      }
      console.log(`[EmailVerification] resend requested userId=${user.id} email=${user.email}`);
      const cooldownKey = `email_${user.id}`;
      if (!canResend(cooldownKey)) {
        const retryAfter = 60;
        console.log(`[EmailVerification] resend rate limited retryAfter=${retryAfter} userId=${user.id}`);
        res.status(429).json({
          error: "rate_limited",
          message: "Aguarde antes de solicitar um novo código.",
          retryAfter,
        });
        return;
      }
      const result = await createVerificationToken(user.id, "email");
      if (!result) {
        console.log(`[EmailVerification] resend rate limited (max tokens/hour) userId=${user.id}`);
        res.status(429).json({
          error: "rate_limited",
          message: "Muitas tentativas. Aguarde 1 hora.",
          retryAfter: 3600,
        });
        return;
      }
      const settings = await appSettings();
      const appName = settings?.appName || "debuga.ai";
      const sent = await sendVerificationEmail(user.email!, result.code, appName);
      if (!sent) {
        console.error(`[EmailVerification] verification email FAILED reason=smtp_error userId=${user.id}`);
        res.status(500).json({ error: "Falha ao enviar e-mail. Tente novamente." });
        return;
      }
      markResent(cooldownKey);
      console.log(`[EmailVerification] verification email sent OK userId=${user.id}`);
      res.json({ success: true, message: "Código de verificação enviado." });
    } catch (err) {
      console.error("[EmailVerification] Resend error:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/forgot-password — Send password reset code
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    console.log(`[PasswordReset] forgot-password route HIT, body: ${JSON.stringify(req.body || {})}`);
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "E-mail é obrigatório." });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[PasswordReset] request received email=${normalizedEmail}`);
      const user = await db.getUserByEmail(normalizedEmail);
      console.log(`[PasswordReset] user found: ${!!user}, authProvider: ${user?.authProvider || "N/A"}`);

      // Always return success to prevent email enumeration
      if (!user || user.authProvider !== "local") {
        console.log(`[PasswordReset] user not found or not local — returning safe response`);
        res.json({ ok: true, message: "Se este e-mail existir, enviaremos um código de recuperação." });
        return;
      }

      const cooldownKey = `reset_${user.id}`;
      if (!canResend(cooldownKey)) {
        console.log(`[PasswordReset] rate limited (cooldown) userId=${user.id}`);
        res.json({ ok: true, message: "Se este e-mail existir, enviaremos um código de recuperação." });
        return;
      }

      const result = await createVerificationToken(user.id, "password_reset");
      if (!result) {
        console.log(`[PasswordReset] rate limited (max tokens/hour) userId=${user.id}`);
        res.json({ ok: true, message: "Se este e-mail existir, enviaremos um código de recuperação." });
        return;
      }

      console.log(`[PasswordReset] reset code generated userId=${user.id}`);
      const settings = await appSettings();
      const appName = settings?.appName || "debuga.ai";

      const sent = await sendPasswordResetEmail(normalizedEmail, result.code, appName);
      if (!sent) {
        console.error(`[PasswordReset] reset email FAILED reason=smtp_error userId=${user.id}`);
        // Still return safe response to prevent enumeration
        res.json({ ok: true, message: "Se este e-mail existir, enviaremos um código de recuperação." });
        return;
      }
      markResent(cooldownKey);
      console.log(`[PasswordReset] reset email sent OK userId=${user.id}`);

      await db.createAuditLog({
        userId: user.id,
        action: "password_reset_requested",
        entityType: "user",
        entityId: user.id,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      });

      res.json({ ok: true, message: "Se este e-mail existir, enviaremos um código de recuperação." });
    } catch (err) {
      console.error("[EmailVerification] Forgot password error:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/reset-password — Reset password with code
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    console.log(`[PasswordReset] reset-password route HIT, email: ${req.body?.email || "(none)"}`);
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        res.status(400).json({ error: "E-mail, código e nova senha são obrigatórios." });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await db.getUserByEmail(normalizedEmail);

      if (!user || user.authProvider !== "local") {
        res.status(400).json({ error: "Código inválido ou expirado." });
        return;
      }

      // Import validatePassword from localAuth
      const { validatePassword } = await import("./localAuth");
      const passwordCheck = validatePassword(newPassword);
      if (!passwordCheck.valid) {
        res.status(400).json({ error: passwordCheck.message });
        return;
      }

      const isValid = await verifyToken(user.id, code, "password_reset");
      if (!isValid) {
        res.status(400).json({ error: "Código inválido ou expirado." });
        return;
      }

      const { hashPassword } = await import("./localAuth");
      const newHash = await hashPassword(newPassword);
      await db.updateUserPassword(user.id, newHash);

      // Reset failed login attempts
      const dbConn = await db.getDb();
      if (dbConn) {
        await dbConn
          .update(users)
          .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      await db.createAuditLog({
        userId: user.id,
        action: "password_reset_completed",
        entityType: "user",
        entityId: user.id,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      });

      console.log(`[EmailVerification] Password reset completed for user ${user.id}`);
      res.json({ success: true, message: "Senha redefinida com sucesso. Faça login com a nova senha." });
    } catch (err) {
      console.error("[EmailVerification] Reset password error:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  console.log("[EmailVerification] Routes registered");
}

// ── Exported helpers for use in registration flow ──
export { createVerificationToken, sendVerificationEmail };
