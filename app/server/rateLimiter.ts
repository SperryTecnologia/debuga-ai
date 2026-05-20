/**
 * Rate Limiting Middleware for debuga.ai
 * 
 * Provides configurable rate limiting for:
 * - Auth endpoints (login, register, password reset)
 * - API endpoints (chat, general)
 * - Global request limiting
 * 
 * Uses in-memory store (suitable for single-instance Docker deployment).
 * For multi-instance, replace with Redis store.
 */
import type { Express, Request, Response, NextFunction } from "express";
import { ENV } from "./_core/env";

// ── Rate limit store (in-memory) ──
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [, store] of Array.from(stores)) {
    for (const [key, entry] of Array.from(store)) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }
}, 60 * 1000); // Every minute

// ── Rate limiter factory ──
interface RateLimitConfig {
  name: string;
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
}

function createRateLimiter(config: RateLimitConfig) {
  const store = getStore(config.name);
  const {
    windowMs,
    maxRequests,
    message = "Muitas requisições. Tente novamente mais tarde.",
    keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown",
    skipIf,
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if condition met
    if (skipIf && skipIf(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      // New window
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.status(429).json({ error: message });
      return;
    }

    entry.count++;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - entry.count);
    next();
  };
}

// ── Pre-configured limiters ──

/**
 * Auth endpoints: 5 requests per 15 minutes per IP
 */
export const authLimiter = createRateLimiter({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Muitas tentativas de autenticação. Tente novamente em 15 minutos.",
});

/**
 * Registration: 3 per hour per IP
 */
export const registerLimiter = createRateLimiter({
  name: "register",
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  message: "Muitas tentativas de registro. Tente novamente em 1 hora.",
});

/**
 * Password reset: 3 per 15 minutes per IP
 */
export const passwordResetLimiter = createRateLimiter({
  name: "password_reset",
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
  message: "Muitas solicitações de redefinição. Tente novamente em 15 minutos.",
});

/**
 * Chat/stream: 30 per minute per user
 */
export const chatLimiter = createRateLimiter({
  name: "chat",
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Limite de mensagens atingido. Aguarde um momento.",
  keyGenerator: (req) => {
    // Use user ID from cookie/session if available, fallback to IP
    return (req as any).userId?.toString() || req.ip || "unknown";
  },
});

/**
 * General API: 100 per minute per IP
 */
export const apiLimiter = createRateLimiter({
  name: "api",
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: "Limite de requisições atingido. Tente novamente em breve.",
});

/**
 * Verification code resend: 3 per 5 minutes per IP
 */
export const verificationLimiter = createRateLimiter({
  name: "verification",
  windowMs: 5 * 60 * 1000,
  maxRequests: 3,
  message: "Muitas solicitações de código. Aguarde 5 minutos.",
});

// ── Register rate limiting middleware ──
export function registerRateLimiting(app: Express) {
  if (!ENV.rateLimitEnabled) {
    console.log("[RateLimiter] Rate limiting disabled (RATE_LIMIT_ENABLED=false)");
    return;
  }

  console.log("[RateLimiter] Rate limiting enabled");

  // Apply to auth routes
  app.use("/api/auth/local/login", authLimiter);
  app.use("/api/auth/local/register", registerLimiter);
  app.use("/api/auth/forgot-password", passwordResetLimiter);
  app.use("/api/auth/reset-password", passwordResetLimiter);
  app.use("/api/auth/resend-verification", verificationLimiter);
  app.use("/api/auth/send-phone-otp", verificationLimiter);

  // Apply to chat/stream
  app.use("/api/chat", chatLimiter);

  // Apply general API limiter
  app.use("/api/", apiLimiter);
}
