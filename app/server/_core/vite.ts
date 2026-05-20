import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

/**
 * Setup Vite dev server middleware (development only).
 * Uses dynamic import so that 'vite' and 'vite.config' are NOT bundled
 * into dist/index.js by esbuild.
 *
 * In production, this function is never called (guarded by NODE_ENV check
 * in index.ts), but esbuild still bundles dynamic imports of relative paths.
 * To avoid this, we construct the path at runtime so esbuild cannot resolve it.
 */
export async function setupVite(app: Express, server: Server) {
  // Dynamic imports — only resolved at runtime in development
  const { createServer: createViteServer } = await import("vite");
  const { nanoid } = await import("nanoid");

  // Construct path dynamically so esbuild cannot statically analyze and bundle it
  const configPath = path.resolve(import.meta.dirname, "..", "..", "vite.config.ts");
  const viteConfigModule = await import(/* @vite-ignore */ configPath);
  const viteConfig = viteConfigModule.default;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Serve pre-built static files in production.
 * No dependency on 'vite' — only uses express.static.
 */
export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
