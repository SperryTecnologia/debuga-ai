import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

/**
 * Detect if the original client request was HTTPS.
 * Behind Nginx/Cloudflare, the app sees HTTP but x-forwarded-proto is "https".
 */
function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Session cookie options for production.
 *
 * Strategy:
 * - Production (HTTPS via Nginx): secure=true, sameSite="lax"
 *   → "lax" allows the cookie to be sent on same-site navigations AND
 *     top-level redirects from Google OAuth (which is what we need).
 *   → "strict" would break OAuth callbacks because the redirect comes from google.com.
 *   → "none" requires secure=true and is only needed for cross-origin iframes/fetch.
 *
 * - Development (HTTP localhost): secure=false, sameSite="lax"
 *
 * Domain:
 * - Set to ".debuga.ai" in production so cookies work across subdomains.
 * - Not set for localhost/IP addresses.
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const secure = isSecureRequest(req);

  // Determine domain for cookie scope
  const isLocal = LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);
  let domain: string | undefined;

  if (!isLocal && hostname) {
    // For production domains, set cookie domain to allow subdomains
    // e.g., "debuga.ai" → ".debuga.ai" (covers www.debuga.ai, app.debuga.ai)
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join(".");
      domain = `.${rootDomain}`;
    }
  }

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    ...(domain ? { domain } : {}),
  };
}
