/**
 * Environment configuration for debuga.ai.
 *
 * LLM Provider Priority (self-hosted):
 *   1. Explicit provider (LLM_PROVIDER=gemini|openai|ollama|cloud|forge)
 *   2. Gemini (GEMINI_API_URL + GEMINI_API_KEY)
 *   3. OpenAI (OPENAI_API_URL + OPENAI_API_KEY)
 *   4. Cloud generic (LLM_CLOUD_API_URL + LLM_CLOUD_API_KEY)
 *   5. Cloud Forge API (legacy fallback)
 *   6. Ollama local (ENABLE_LOCAL_INFERENCE=true)
 *
 * Fallback: LLM_FALLBACK_PROVIDER=openai|gemini|cloud|forge|ollama
 */

export const ENV = {
  // App
  appEnv: process.env.APP_ENV ?? "production",
  appUrl: process.env.APP_URL ?? "https://debuga.ai",
  appId: process.env.VITE_APP_ID ?? "debuga-ai",

  // Auth (Google OAuth)
  cookieSecret: process.env.JWT_SECRET ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  authBaseUrl: process.env.AUTH_BASE_URL ?? "",

  // Auth modes
  enableGoogleOAuth: process.env.ENABLE_GOOGLE_OAUTH !== "false", // default true
  enableLocalLogin: process.env.ENABLE_LOCAL_LOGIN !== "false", // default true

  // Admin
  adminEmail: process.env.ADMIN_EMAIL ?? "",

  // Legacy OAuth (kept for compatibility)
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Owner
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  ownerName: process.env.OWNER_NAME ?? "",

  // ══════════════════════════════════════════════════════════════
  // LLM Provider Configuration (multi-provider with fallback)
  // ══════════════════════════════════════════════════════════════

  // Explicit provider selection (optional, auto-detected if not set)
  llmProvider: process.env.LLM_PROVIDER ?? "", // gemini|openai|ollama|cloud|forge
  llmFallbackProvider: process.env.LLM_FALLBACK_PROVIDER ?? "", // fallback provider

  // Gemini (priority 1 for self-hosted)
  geminiApiUrl: process.env.GEMINI_API_URL ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  // OpenAI (priority 2)
  openaiApiUrl: process.env.OPENAI_API_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  // Cloud generic (priority 3 — backward compatible with existing .env files)
  cloudApiUrl: process.env.LLM_CLOUD_API_URL ?? "",
  cloudApiKey: process.env.LLM_CLOUD_API_KEY ?? "",
  cloudModel: process.env.LLM_CLOUD_MODEL ?? "gemini-2.5-flash",

  // Cloud Forge API (priority 4 — legacy fallback)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // LLM - Local GPU (Ollama) — Single VM GPU mode
  localLlmEnabled: process.env.LOCAL_LLM_ENABLED === "true" || process.env.ENABLE_LOCAL_INFERENCE === "true",
  localLlmProvider: process.env.LOCAL_LLM_PROVIDER ?? "ollama",
  localLlmBaseUrl: process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434",
  localLlmModel: process.env.LOCAL_LLM_MODEL ?? "llama3.1:8b",
  localLlmTimeoutSeconds: parseInt(process.env.LOCAL_LLM_TIMEOUT_SECONDS || "120"),
  localLlmFallbackEnabled: process.env.LOCAL_LLM_FALLBACK_ENABLED !== "false", // default true
  localLlmPriority: process.env.LOCAL_LLM_PRIORITY ?? "first", // first | last | only
  localLlmRequireGpu: process.env.LOCAL_LLM_REQUIRE_GPU === "true",
  // Legacy alias
  enableLocalInference: process.env.LOCAL_LLM_ENABLED === "true" || process.env.ENABLE_LOCAL_INFERENCE === "true",

  // Storage (MinIO / S3)
  s3Endpoint: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || "",
  s3PublicEndpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.MINIO_PUBLIC_ENDPOINT || "",
  s3Bucket: process.env.S3_BUCKET || process.env.MINIO_BUCKET || "debuga-assets",
  s3AccessKey: process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || process.env.AWS_ACCESS_KEY_ID || "",
  s3SecretKey: process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || process.env.AWS_SECRET_ACCESS_KEY || "",
  s3Region: process.env.S3_REGION || "us-east-1",
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",

  // Stripe
  stripeMode: process.env.STRIPE_MODE ?? "test",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",

  // App title / logo
  appTitle: process.env.VITE_APP_TITLE ?? "debuga.ai",
  appLogo: process.env.VITE_APP_LOGO ?? "",

  // Frontend forge (for client-side LLM calls if needed)
  frontendForgeApiKey: process.env.VITE_FRONTEND_FORGE_API_KEY ?? "",
  frontendForgeApiUrl: process.env.VITE_FRONTEND_FORGE_API_URL ?? "",

  // Analytics
  analyticsEndpoint: process.env.VITE_ANALYTICS_ENDPOINT ?? "",
  analyticsWebsiteId: process.env.VITE_ANALYTICS_WEBSITE_ID ?? "",

  // ══════════════════════════════════════════════════════════════
  // Auth Hardening Configuration
  // ══════════════════════════════════════════════════════════════

  // Email verification
  emailVerificationEnabled: process.env.EMAIL_VERIFICATION_ENABLED === "true",
  requireEmailForChat: process.env.REQUIRE_EMAIL_FOR_CHAT === "true",
  requireTermsAcceptance: process.env.REQUIRE_TERMS_ACCEPTANCE === "true",

  // SMTP (for email verification)
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  smtpSecure: process.env.SMTP_SECURE === "true",

  // Phone/WhatsApp verification
  phoneVerificationEnabled: process.env.PHONE_VERIFICATION_ENABLED === "true",
  phoneOtpProvider: process.env.PHONE_OTP_PROVIDER ?? "console", // twilio|whatsapp|console

  // Twilio (for phone OTP)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",

  // WhatsApp Business API (for phone OTP)
  whatsappApiUrl: process.env.WHATSAPP_API_URL ?? "",
  whatsappApiToken: process.env.WHATSAPP_API_TOKEN ?? "",

  // Cloudflare Turnstile CAPTCHA
  enableTurnstile: process.env.ENABLE_TURNSTILE === "true",
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
  turnstileOnLogin: process.env.TURNSTILE_ON_LOGIN === "true",

  // Disposable email blocking
  blockDisposableEmails: process.env.BLOCK_DISPOSABLE_EMAILS !== "false", // default true

  // Rate limiting
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false", // default true
  authRateLimitWindowMinutes: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || "15"),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "10"),
  chatRateLimitWindowMinutes: parseInt(process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES || "1"),
  chatRateLimitMax: parseInt(process.env.CHAT_RATE_LIMIT_MAX || "20"),

  // Runtime
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000"),
};

// ══════════════════════════════════════════════════════════════
// LLM Provider Resolution
// ══════════════════════════════════════════════════════════════

export type LLMProviderConfig = {
  name: string; // gemini, openai, cloud, forge, ollama
  apiUrl: string;
  apiKey: string;
  model: string;
};

/**
 * Resolve the active LLM provider based on priority.
 * Returns null if no provider is configured.
 */
export function resolveLLMProvider(providerOverride?: string): LLMProviderConfig | null {
  const explicit = providerOverride || ENV.llmProvider;

  // If explicit provider is set, use it directly
  if (explicit) {
    switch (explicit.toLowerCase()) {
      case "gemini":
        if (ENV.geminiApiKey || ENV.cloudApiKey) {
          return {
            name: "gemini",
            apiUrl: ENV.geminiApiUrl || ENV.cloudApiUrl || "https://generativelanguage.googleapis.com/v1beta/openai",
            apiKey: ENV.geminiApiKey || ENV.cloudApiKey,
            model: ENV.geminiModel || ENV.cloudModel || "gemini-2.5-flash",
          };
        }
        break;
      case "openai":
        if (ENV.openaiApiKey || ENV.cloudApiKey) {
          return {
            name: "openai",
            apiUrl: ENV.openaiApiUrl || ENV.cloudApiUrl || "https://api.openai.com/v1",
            apiKey: ENV.openaiApiKey || ENV.cloudApiKey,
            model: ENV.openaiModel || ENV.cloudModel || "gpt-4o-mini",
          };
        }
        break;
      case "cloud":
        if (ENV.cloudApiKey) {
          return {
            name: "cloud",
            apiUrl: ENV.cloudApiUrl,
            apiKey: ENV.cloudApiKey,
            model: ENV.cloudModel || "gemini-2.5-flash",
          };
        }
        break;
      case "forge":
        if (ENV.forgeApiUrl && ENV.forgeApiKey) {
          return {
            name: "forge",
            apiUrl: ENV.forgeApiUrl,
            apiKey: ENV.forgeApiKey,
            model: ENV.cloudModel || "gemini-2.5-flash",
          };
        }
        break;
      case "ollama":
      case "local_gpu":
        if (ENV.localLlmEnabled) {
          return {
            name: "local_gpu",
            apiUrl: ENV.localLlmBaseUrl,
            apiKey: "",
            model: ENV.localLlmModel,
          };
        }
        break;
    }
  }

  // Auto-detect: priority order for self-hosted
  // 1. Gemini (dedicated vars)
  if (ENV.geminiApiUrl && ENV.geminiApiKey) {
    return {
      name: "gemini",
      apiUrl: ENV.geminiApiUrl,
      apiKey: ENV.geminiApiKey,
      model: ENV.geminiModel,
    };
  }

  // 2. OpenAI (dedicated vars)
  if (ENV.openaiApiUrl && ENV.openaiApiKey) {
    return {
      name: "openai",
      apiUrl: ENV.openaiApiUrl,
      apiKey: ENV.openaiApiKey,
      model: ENV.openaiModel,
    };
  }

  // 3. Cloud generic (LLM_CLOUD_*)
  if (ENV.cloudApiUrl && ENV.cloudApiKey) {
    return {
      name: "cloud",
      apiUrl: ENV.cloudApiUrl,
      apiKey: ENV.cloudApiKey,
      model: ENV.cloudModel,
    };
  }

  // 4. Cloud Forge API (legacy — only if explicitly configured)
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    return {
      name: "forge",
      apiUrl: ENV.forgeApiUrl,
      apiKey: ENV.forgeApiKey,
      model: ENV.cloudModel || "gemini-2.5-flash",
    };
  }

  // 5. Ollama local (local_gpu)
  if (ENV.localLlmEnabled && ENV.localLlmBaseUrl) {
    return {
      name: "local_gpu",
      apiUrl: ENV.localLlmBaseUrl,
      apiKey: "",
      model: ENV.localLlmModel,
    };
  }

  return null;
}

/**
 * Resolve the fallback LLM provider.
 * Returns null if no fallback is configured.
 */
export function resolveFallbackProvider(): LLMProviderConfig | null {
  if (!ENV.llmFallbackProvider) return null;
  return resolveLLMProvider(ENV.llmFallbackProvider);
}

/**
 * Log LLM configuration at boot (safe — never exposes keys).
 */
export function logLLMConfig(): void {
  const primary = resolveLLMProvider();
  const fallback = resolveFallbackProvider();

  console.log("[LLM Config] ─────────────────────────────────────");
  if (primary) {
    console.log(`[LLM Config] Provider active: ${primary.name}`);
    console.log(`[LLM Config] Cloud URL configured: yes`);
    console.log(`[LLM Config] Cloud Key configured: yes (${primary.apiKey.slice(0, 4)}...)`);
    console.log(`[LLM Config] Cloud Model: ${primary.model}`);
  } else {
    console.log(`[LLM Config] Provider active: NONE`);
    console.log(`[LLM Config] Cloud URL configured: no`);
    console.log(`[LLM Config] Cloud Key configured: no`);
    console.log(`[LLM Config] Cloud Model: —`);
  }

  if (fallback) {
    console.log(`[LLM Config] Fallback provider: ${fallback.name} (${fallback.model})`);
  } else {
    console.log(`[LLM Config] Fallback provider: none`);
  }

  console.log(`[LLM Config] Forge fallback enabled: ${ENV.forgeApiUrl && ENV.forgeApiKey ? "yes" : "no"}`);
  console.log(`[LLM Config] Local GPU: ${ENV.localLlmEnabled ? "enabled" : "disabled"}${ENV.localLlmEnabled ? ` (priority: ${ENV.localLlmPriority}, model: ${ENV.localLlmModel})` : ""}`);
  console.log(`[LLM Config] Local GPU fallback: ${ENV.localLlmFallbackEnabled ? "enabled" : "disabled"}`);
  console.log(`[LLM Config] Local GPU timeout: ${ENV.localLlmTimeoutSeconds}s`);
  console.log("[LLM Config] ─────────────────────────────────────");
}
