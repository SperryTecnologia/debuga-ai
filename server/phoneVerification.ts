/**
 * Phone/WhatsApp OTP Verification Module for debuga.ai
 * 
 * DISABLED BY DEFAULT — requires PHONE_VERIFICATION_ENABLED=true
 * and a configured provider (Twilio, Vonage, or custom WhatsApp API).
 * 
 * This module provides:
 * - Provider abstraction (easy to swap Twilio/Vonage/WhatsApp Business API)
 * - OTP generation and verification
 * - Rate limiting per phone number
 * - Endpoints for sending and verifying OTP
 */
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { users } from "../drizzle/schema";
import { createVerificationToken } from "./emailVerification";

// ── Provider Interface ──
interface OTPProvider {
  name: string;
  sendOTP(phone: string, code: string, appName: string): Promise<boolean>;
}

// ── Twilio Provider (example implementation) ──
class TwilioProvider implements OTPProvider {
  name = "twilio";

  async sendOTP(phone: string, code: string, appName: string): Promise<boolean> {
    const accountSid = ENV.twilioAccountSid;
    const authToken = ENV.twilioAuthToken;
    const fromNumber = ENV.twilioFromNumber;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("[PhoneVerification] Twilio credentials not configured");
      return false;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: `[${appName}] Seu código de verificação é: ${code}. Válido por 30 minutos.`,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[PhoneVerification] Twilio error:", error);
        return false;
      }

      console.log(`[PhoneVerification] OTP sent via Twilio to ${phone}`);
      return true;
    } catch (err) {
      console.error("[PhoneVerification] Twilio send error:", err);
      return false;
    }
  }
}

// ── WhatsApp Business API Provider (placeholder) ──
class WhatsAppProvider implements OTPProvider {
  name = "whatsapp";

  async sendOTP(phone: string, code: string, appName: string): Promise<boolean> {
    const apiUrl = ENV.whatsappApiUrl;
    const apiToken = ENV.whatsappApiToken;

    if (!apiUrl || !apiToken) {
      console.error("[PhoneVerification] WhatsApp API credentials not configured");
      return false;
    }

    try {
      // WhatsApp Business API template message
      const response = await fetch(`${apiUrl}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/\D/g, ""),
          type: "template",
          template: {
            name: "verification_code",
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: code },
                  { type: "text", text: appName },
                ],
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[PhoneVerification] WhatsApp API error:", error);
        return false;
      }

      console.log(`[PhoneVerification] OTP sent via WhatsApp to ${phone}`);
      return true;
    } catch (err) {
      console.error("[PhoneVerification] WhatsApp send error:", err);
      return false;
    }
  }
}

// ── Console/Dev Provider ──
class ConsoleProvider implements OTPProvider {
  name = "console";

  async sendOTP(phone: string, code: string, appName: string): Promise<boolean> {
    console.log("═══════════════════════════════════════════════════════");
    console.log(`[PhoneVerification] DEV MODE — OTP for ${phone}: ${code}`);
    console.log(`[PhoneVerification] App: ${appName}`);
    console.log("═══════════════════════════════════════════════════════");
    return true;
  }
}

// ── Provider factory ──
function getProvider(): OTPProvider {
  const providerName = ENV.phoneOtpProvider || "console";

  switch (providerName) {
    case "twilio":
      return new TwilioProvider();
    case "whatsapp":
      return new WhatsAppProvider();
    default:
      return new ConsoleProvider();
  }
}

// ── Phone number validation ──
function isValidPhone(phone: string): boolean {
  // Brazilian format: +55 (XX) XXXXX-XXXX or international
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// ── Rate limiting (in-memory) ──
const phoneCooldowns = new Map<string, number>();
const PHONE_COOLDOWN_MS = 120 * 1000; // 2 minutes between sends

// ── Register phone verification routes ──
export function registerPhoneVerificationRoutes(app: Express) {
  if (!ENV.phoneVerificationEnabled) {
    console.log("[PhoneVerification] Phone verification disabled (PHONE_VERIFICATION_ENABLED=false)");
    return;
  }

  console.log(`[PhoneVerification] Phone verification enabled (provider: ${ENV.phoneOtpProvider || "console"})`);

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/send-phone-otp — Send OTP to phone number
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/send-phone-otp", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado." });
        return;
      }

      const { phone } = req.body;
      if (!phone || !isValidPhone(phone)) {
        res.status(400).json({ error: "Número de telefone inválido." });
        return;
      }

      // Rate limit
      const cooldownKey = `phone_${user.id}`;
      const lastSent = phoneCooldowns.get(cooldownKey);
      if (lastSent && Date.now() - lastSent < PHONE_COOLDOWN_MS) {
        const remaining = Math.ceil((PHONE_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
        res.status(429).json({ error: `Aguarde ${remaining} segundos antes de solicitar novo código.` });
        return;
      }

      // Save phone to user profile if not set
      const dbConn = await db.getDb();
      if (dbConn && user.phone !== phone) {
        await dbConn
          .update(users)
          .set({ phone, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      // Generate token
      const result = await createVerificationToken(user.id, "phone");
      if (!result) {
        res.status(429).json({ error: "Muitas tentativas. Aguarde 1 hora." });
        return;
      }

      // Send OTP
      const settings = await db.getAppSettings();
      const appName = settings?.appName || "debuga.ai";
      const provider = getProvider();
      const sent = await provider.sendOTP(phone, result.code, appName);

      if (!sent) {
        res.status(500).json({ error: "Falha ao enviar SMS/WhatsApp. Tente novamente." });
        return;
      }

      phoneCooldowns.set(cooldownKey, Date.now());
      res.json({ success: true, message: "Código enviado.", provider: provider.name });
    } catch (err) {
      console.error("[PhoneVerification] Send OTP error:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/verify-phone — Verify phone with OTP code
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado." });
        return;
      }

      const { code } = req.body;
      if (!code || code.length !== 6) {
        res.status(400).json({ error: "Código inválido." });
        return;
      }

      // Import verifyToken from emailVerification (shared logic)
      const { default: evModule } = await import("./emailVerification") as any;
      const verifyTokenFn = (await import("./emailVerification") as any).verifyToken || (async (userId: number, c: string, type: string) => {
        // Fallback inline verification
        const crypto = await import("crypto");
        const { eq, and, isNull, gt } = await import("drizzle-orm");
        const { authVerificationTokens } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) return false;
        const codeHash = crypto.createHash("sha256").update(c).digest("hex");
        const now = new Date();
        const tokens = await dbConn
          .select()
          .from(authVerificationTokens)
          .where(
            and(
              eq(authVerificationTokens.userId, userId),
              eq(authVerificationTokens.type, type as any),
              eq(authVerificationTokens.tokenHash, codeHash),
              isNull(authVerificationTokens.usedAt),
              gt(authVerificationTokens.expiresAt, now)
            )
          )
          .limit(1);
        if (tokens.length === 0) return false;
        await dbConn
          .update(authVerificationTokens)
          .set({ usedAt: now })
          .where(eq(authVerificationTokens.id, tokens[0].id));
        return true;
      });

      // Verify using shared token logic
      const crypto = await import("crypto");
      const { and: andOp, isNull: isNullOp, gt: gtOp } = await import("drizzle-orm");
      const { authVerificationTokens } = await import("../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) {
        res.status(500).json({ error: "Database not available." });
        return;
      }

      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      const now = new Date();
      const tokens = await dbConn
        .select()
        .from(authVerificationTokens)
        .where(
          andOp(
            eq(authVerificationTokens.userId, user.id),
            eq(authVerificationTokens.type, "phone"),
            eq(authVerificationTokens.tokenHash, codeHash),
            isNullOp(authVerificationTokens.usedAt),
            gtOp(authVerificationTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (tokens.length === 0) {
        res.status(400).json({ error: "Código inválido ou expirado." });
        return;
      }

      // Mark token as used
      await dbConn
        .update(authVerificationTokens)
        .set({ usedAt: now })
        .where(eq(authVerificationTokens.id, tokens[0].id));

      // Mark phone as verified
      await dbConn
        .update(users)
        .set({ phoneVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      await db.createAuditLog({
        userId: user.id,
        action: "phone_verified",
        entityType: "user",
        entityId: user.id,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      });

      console.log(`[PhoneVerification] Phone verified for user ${user.id}`);
      res.json({ success: true, message: "Telefone verificado com sucesso!" });
    } catch (err) {
      console.error("[PhoneVerification] Verify error:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/auth/phone-config — Return phone verification status
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/auth/phone-config", (_req: Request, res: Response) => {
    res.json({
      enabled: true,
      provider: ENV.phoneOtpProvider || "console",
      cooldownSeconds: PHONE_COOLDOWN_MS / 1000,
    });
  });
}
