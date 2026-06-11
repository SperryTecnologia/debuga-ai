/**
 * Public Branding Endpoint for debuga.ai
 * 
 * Serves white-label configuration from the database to the frontend.
 * This endpoint is PUBLIC (no auth required) so the frontend can load
 * branding on first render, before any user session is established.
 * 
 * Cached in-memory for 60 seconds to avoid hitting the DB on every page load.
 */
import type { Express, Request, Response } from "express";
import { getAppSettings } from "./db";

// ── Types ──
export interface BrandingConfig {
  appName: string;
  agentName: string;
  companyName: string;
  domain: string;
  description: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  supportEmail: string;
  supportWhatsapp: string;
  welcomeMessage: string;
  footerText: string;
  termsUrl: string;
  privacyUrl: string;
  githubUrl: string;
}

// ── Cache ──
let cachedBranding: BrandingConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

// ── Defaults ──
const DEFAULTS: BrandingConfig = {
  appName: "debuga.ai",
  agentName: "debuga.ai",
  companyName: "Sperry Tecnologia",
  domain: "Infraestrutura de TI, Segurança da Informação, DevOps e Telecomunicações",
  description: "Agente Autônomo de IA para Infraestrutura",
  primaryColor: "#22c55e",
  logoUrl: "",
  faviconUrl: "",
  supportEmail: "",
  supportWhatsapp: "",
  welcomeMessage: "",
  footerText: "",
  termsUrl: "/termos",
  privacyUrl: "/privacidade",
  githubUrl: "",
};

/**
 * Load branding from DB with caching.
 * Returns merged defaults + DB values.
 */
export async function getBranding(): Promise<BrandingConfig> {
  const now = Date.now();
  if (cachedBranding && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedBranding;
  }

  try {
    const settings = await getAppSettings("default");
    if (!settings) {
      cachedBranding = { ...DEFAULTS };
    } else {
      const links = (settings.institutionalLinks || {}) as Record<string, string>;
      cachedBranding = {
        appName: settings.appName || DEFAULTS.appName,
        agentName: settings.agentName || DEFAULTS.agentName,
        companyName: settings.legalCompanyName || DEFAULTS.companyName,
        domain: settings.niche || DEFAULTS.domain,
        description: settings.landingSubtitle || DEFAULTS.description,
        primaryColor: settings.primaryColor || DEFAULTS.primaryColor,
        logoUrl: settings.logoUrl || DEFAULTS.logoUrl,
        faviconUrl: settings.faviconUrl || DEFAULTS.faviconUrl,
        supportEmail: settings.supportEmail || DEFAULTS.supportEmail,
        supportWhatsapp: settings.supportWhatsapp || DEFAULTS.supportWhatsapp,
        welcomeMessage: settings.welcomeMessage || DEFAULTS.welcomeMessage,
        footerText: links.footerText || DEFAULTS.footerText,
        termsUrl: settings.termsUrl || DEFAULTS.termsUrl,
        privacyUrl: settings.privacyUrl || DEFAULTS.privacyUrl,
        githubUrl: links.githubUrl || DEFAULTS.githubUrl,
      };
    }
    cacheTimestamp = now;
  } catch (err) {
    console.warn("[Branding] Failed to load from DB, using defaults:", err);
    cachedBranding = { ...DEFAULTS };
    cacheTimestamp = now;
  }

  return cachedBranding;
}

/**
 * Invalidate the branding cache (called after admin saves settings).
 */
export function invalidateBrandingCache(): void {
  cachedBranding = null;
  cacheTimestamp = 0;
}

/**
 * Register the public branding endpoint on the Express app.
 */
export function registerBrandingRoute(app: Express): void {
  app.get("/api/branding", async (_req: Request, res: Response) => {
    try {
      const branding = await getBranding();
      res.set("Cache-Control", "public, max-age=60");
      res.json(branding);
    } catch (err) {
      console.error("[Branding] Error:", err);
      res.status(500).json({ error: "Failed to load branding" });
    }
  });
}
