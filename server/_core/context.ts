import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const { req } = opts;

  // Log auth context for debugging (only on auth.me calls to avoid noise)
  const isAuthMe = req.url?.includes("auth.me");
  const cookieHeader = req.headers.cookie;
  const hasCookie = cookieHeader?.includes(COOKIE_NAME) ?? false;

  if (isAuthMe) {
    console.log(`[Auth] ─── auth.me request ───`);
    console.log(`[Auth]   cookie header present: ${!!cookieHeader}`);
    console.log(`[Auth]   ${COOKIE_NAME} cookie present: ${hasCookie}`);
    console.log(`[Auth]   req.hostname: ${req.hostname}`);
    console.log(`[Auth]   req.protocol: ${req.protocol}`);
    console.log(`[Auth]   x-forwarded-proto: ${req.headers["x-forwarded-proto"] || "(none)"}`);
    console.log(`[Auth]   origin: ${req.headers.origin || "(none)"}`);
    if (hasCookie && cookieHeader) {
      // Extract just the cookie value length for debugging (don't log the actual token)
      const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match) {
        console.log(`[Auth]   cookie value length: ${match[1].length}`);
        console.log(`[Auth]   cookie value prefix: ${match[1].slice(0, 20)}...`);
      }
    }
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
    if (isAuthMe) {
      console.log(`[Auth]   ✓ authenticated: openId=${user.openId}, name=${user.name}`);
    }
  } catch (error: any) {
    if (isAuthMe) {
      console.log(`[Auth]   ✗ authentication failed: ${error?.message || error}`);
      if (!hasCookie) {
        console.log(`[Auth]   → No session cookie sent. Possible causes:`);
        console.log(`[Auth]     1. Cookie domain mismatch (Set-Cookie domain vs request domain)`);
        console.log(`[Auth]     2. Cookie secure=true but request is HTTP`);
        console.log(`[Auth]     3. Cookie was never set (OAuth callback failed silently)`);
        console.log(`[Auth]     4. Browser blocked the cookie (third-party cookie policy)`);
      } else {
        console.log(`[Auth]   → Cookie present but invalid. Possible causes:`);
        console.log(`[Auth]     1. JWT_SECRET changed since cookie was issued`);
        console.log(`[Auth]     2. Token expired`);
        console.log(`[Auth]     3. User deleted from database`);
      }
    }
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
