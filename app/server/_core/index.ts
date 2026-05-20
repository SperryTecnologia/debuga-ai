import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { registerAssetProxy } from "../storage";
import { registerOAuthRoutes } from "./oauth";
import { registerStreamRoute } from "../streamRoute";
import { registerLocalAuthRoutes } from "../localAuth";
import { registerStripeRoutes } from "../stripeRoutes";
import { registerUploadRoute } from "../uploadRoute";
import { registerTranscribeRoute } from "../transcribeRoute";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerRateLimiting } from "../rateLimiter";
import { requireEmailVerification } from "../verificationGate";
import { logLLMConfig, ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook needs raw body BEFORE json parser
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

  // Configure body parser with larger size limit
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Rate limiting on auth and chat endpoints
  registerRateLimiting(app);

  // Storage proxy for /storage/* paths
  registerStorageProxy(app);

  // Asset proxy for S3/MinIO assets (serves /api/assets/:key)
  registerAssetProxy(app);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Stripe routes (webhook + checkout + portal)
  registerStripeRoutes(app);

  // File upload endpoint
  registerUploadRoute(app);

  // Audio transcription endpoint
  registerTranscribeRoute(app);

  // Local authentication (email/password)
  registerLocalAuthRoutes(app);

  // Email verification gate for chat (only blocks if enabled)
  app.use("/api/stream", requireEmailVerification);

  // SSE streaming endpoint for chat
  registerStreamRoute(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Log LLM configuration at boot
  logLLMConfig();

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Auto-warmup local GPU if configured (non-blocking)
    if (ENV.localLlmEnabled && ENV.localLlmBaseUrl) {
      setTimeout(async () => {
        try {
          console.log(`[GPU Warmup] Pinging ${ENV.localLlmModel} at ${ENV.localLlmBaseUrl}...`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15_000);
          const resp = await fetch(`${ENV.localLlmBaseUrl}/api/chat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              model: ENV.localLlmModel,
              messages: [{ role: "user", content: "ping" }],
              stream: false,
              options: { num_predict: 1 },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (resp.ok) {
            console.log(`[GPU Warmup] \u2705 Modelo ${ENV.localLlmModel} aquecido e pronto.`);
          } else {
            console.warn(`[GPU Warmup] \u26a0\ufe0f HTTP ${resp.status} - modelo pode n\u00e3o estar carregado.`);
          }
        } catch (err: any) {
          console.warn(`[GPU Warmup] \u26a0\ufe0f Falha: ${err.name === "AbortError" ? "timeout 15s" : err.message}`);
        }
      }, 3000); // Wait 3s after boot to avoid competing with startup
    }
  });
}

startServer().catch(console.error);
