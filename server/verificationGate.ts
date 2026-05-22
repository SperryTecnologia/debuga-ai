/**
 * Verification Gate Middleware for debuga.ai
 * 
 * Blocks access to protected features (chat) for users who haven't
 * verified their email. Admins are always exempt.
 * 
 * Configurable via:
 * - EMAIL_VERIFICATION_ENABLED: master switch
 * - REQUIRE_EMAIL_FOR_CHAT: if true, unverified users can't chat
 */
import type { Request, Response, NextFunction } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

/**
 * Middleware that checks if user has verified their email before
 * allowing access to the chat/stream endpoint.
 * 
 * Exempt:
 * - Admins (role === "admin")
 * - Google OAuth users (emailVerified is auto-set to true)
 * - When EMAIL_VERIFICATION_ENABLED is false
 * - When REQUIRE_EMAIL_FOR_CHAT is false
 */
export async function requireEmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip if email verification is not enabled or not required for chat
  if (!ENV.emailVerificationEnabled || !ENV.requireEmailForChat) {
    return next();
  }

  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      // Let the downstream handler deal with auth
      return next();
    }

    // Admins are always exempt
    if (user.role === "admin") {
      return next();
    }

    // Google OAuth users have email verified by default
    if (user.authProvider === "google") {
      return next();
    }

    // Check email verification status
    if (!user.emailVerified) {
      res.status(403).json({
        error: "Verifique seu e-mail antes de usar o chat.",
        code: "EMAIL_NOT_VERIFIED",
        message: "Um código de verificação foi enviado para seu e-mail. Verifique sua caixa de entrada e spam.",
      });
      return;
    }

    next();
  } catch (err) {
    // If auth check fails, let downstream handle it
    next();
  }
}

/**
 * Returns verification status for the current user.
 * Used by the frontend to show verification warnings.
 */
export function getVerificationStatus(user: any): {
  emailVerified: boolean;
  phoneVerified: boolean;
  requiresEmailVerification: boolean;
  requiresPhoneVerification: boolean;
  isExempt: boolean;
} {
  const isExempt = user.role === "admin" || user.authProvider === "google";

  return {
    emailVerified: user.emailVerified ?? false,
    phoneVerified: user.phoneVerified ?? false,
    requiresEmailVerification: ENV.emailVerificationEnabled && !isExempt,
    requiresPhoneVerification: ENV.phoneVerificationEnabled && !isExempt,
    isExempt,
  };
}
