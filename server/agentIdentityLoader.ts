/**
 * agentIdentityLoader.ts
 * 
 * Loads agent identity configuration from the database (app_settings).
 * Falls back to hardcoded defaults if database is unavailable or fields are empty.
 * 
 * This enables white-label: changing these fields in /admin/white-label
 * changes what the AI says about itself when asked "who are you?".
 * 
 * Precedence: database/app_settings → hardcoded fallback (agentIdentity.ts defaults)
 */

import { getAppSettings } from "./db";
import { AGENT_NAME, AGENT_COMPANY, AGENT_DOMAIN } from "./agentIdentity";

export type AgentIdentityConfig = {
  agentName: string;
  companyName: string;
  domain: string;
};

// In-memory cache with TTL to avoid hitting DB on every message
let cachedIdentity: AgentIdentityConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute — balance between freshness and performance

/**
 * Default identity (hardcoded fallback).
 * Used when database is unavailable or fields are empty.
 */
export const DEFAULT_IDENTITY: AgentIdentityConfig = {
  agentName: AGENT_NAME,       // "debuga.ai"
  companyName: AGENT_COMPANY,  // "Sperry Tecnologia"
  domain: AGENT_DOMAIN,        // "Infraestrutura de TI, Segurança da Informação, DevOps e Telecomunicações"
};

/**
 * Load agent identity from database with fallback to defaults.
 * Results are cached for 1 minute to avoid DB overhead.
 * 
 * @param forceRefresh - Skip cache and reload from DB
 * @returns AgentIdentityConfig with resolved values
 */
export async function getAgentIdentity(forceRefresh = false): Promise<AgentIdentityConfig> {
  const now = Date.now();

  // Return cached if fresh
  if (!forceRefresh && cachedIdentity && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedIdentity;
  }

  try {
    const settings = await getAppSettings("default");

    if (!settings) {
      console.log("[AgentIdentity] No app_settings found — using defaults");
      cachedIdentity = DEFAULT_IDENTITY;
      cacheTimestamp = now;
      return DEFAULT_IDENTITY;
    }

    // Resolve each field: use DB value if non-empty, otherwise fallback
    const identity: AgentIdentityConfig = {
      agentName: settings.agentName?.trim() || settings.appName?.trim() || DEFAULT_IDENTITY.agentName,
      companyName: settings.legalCompanyName?.trim() || DEFAULT_IDENTITY.companyName,
      domain: settings.niche?.trim() || DEFAULT_IDENTITY.domain,
    };

    cachedIdentity = identity;
    cacheTimestamp = now;

    // Log only when identity differs from defaults (useful for debugging white-label)
    if (identity.agentName !== DEFAULT_IDENTITY.agentName ||
        identity.companyName !== DEFAULT_IDENTITY.companyName ||
        identity.domain !== DEFAULT_IDENTITY.domain) {
      console.log(`[AgentIdentity] Loaded from DB: name="${identity.agentName}", company="${identity.companyName}", domain="${identity.domain}"`);
    }

    return identity;
  } catch (err: any) {
    console.warn(`[AgentIdentity] Failed to load from DB: ${err.message} — using defaults`);
    // Non-blocking: return defaults on error
    cachedIdentity = DEFAULT_IDENTITY;
    cacheTimestamp = now;
    return DEFAULT_IDENTITY;
  }
}

/**
 * Invalidate the identity cache.
 * Call this when admin updates white-label settings.
 */
export function invalidateIdentityCache(): void {
  cachedIdentity = null;
  cacheTimestamp = 0;
  console.log("[AgentIdentity] Cache invalidated");
}
