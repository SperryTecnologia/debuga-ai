/**
 * Google OAuth for debuga.ai.
 * Local + Google OAuth implementation.
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getCallbackUrl(req: Request): string {
  const base = ENV.authBaseUrl || `${req.protocol}://${req.get("host")}`;
  return `${base}/api/auth/google/callback`;
}

export function registerOAuthRoutes(app: Express) {
  // Log OAuth config at registration time (once)
  console.log(`[OAuth] Google OAuth: ${ENV.enableGoogleOAuth ? "enabled" : "disabled"}`);
  console.log(`[OAuth] AUTH_BASE_URL: ${ENV.authBaseUrl || "(auto-detect from request)"}`);
  if (ENV.googleClientId) {
    console.log(`[OAuth] Client ID: ${ENV.googleClientId.slice(0, 12)}...`);
    console.log(`[OAuth] Callback URL will be: ${ENV.authBaseUrl || "<origin>"}/api/auth/google/callback`);
  } else {
    console.warn(`[OAuth] GOOGLE_CLIENT_ID is empty — Google OAuth will not work`);
  }

  // Redirect to Google consent screen
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.enableGoogleOAuth) {
      res.status(404).json({ error: "Google OAuth is disabled" });
      return;
    }
    if (!ENV.googleClientId) {
      console.error("[OAuth] GOOGLE_CLIENT_ID not configured");
      res.redirect("/login?error=oauth_not_configured");
      return;
    }
    if (!ENV.googleClientSecret) {
      console.error("[OAuth] GOOGLE_CLIENT_SECRET not configured");
      res.redirect("/login?error=oauth_not_configured");
      return;
    }

    const returnPath = typeof req.query.returnPath === "string" ? req.query.returnPath : "/chat";
    const state = Buffer.from(JSON.stringify({ returnPath })).toString("base64url");
    const callbackUrl = getCallbackUrl(req);

    console.log(`[OAuth] Initiating Google login. redirect_uri=${callbackUrl}, protocol=${req.protocol}, x-forwarded-proto=${req.headers["x-forwarded-proto"] || "(none)"}, host=${req.get("host")}, returnPath=${returnPath}`);

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // Google callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const stateParam = typeof req.query.state === "string" ? req.query.state : undefined;
    const error = typeof req.query.error === "string" ? req.query.error : undefined;

    const callbackUrl = getCallbackUrl(req);

    // Detailed logging for every callback
    console.log(`[OAuth] ─── Callback received ───`);
    console.log(`[OAuth]   redirect_uri: ${callbackUrl}`);
    console.log(`[OAuth]   req.protocol: ${req.protocol}`);
    console.log(`[OAuth]   x-forwarded-proto: ${req.headers["x-forwarded-proto"] || "(none)"}`);
    console.log(`[OAuth]   host: ${req.get("host")}`);
    console.log(`[OAuth]   state present: ${!!stateParam}`);
    console.log(`[OAuth]   code present: ${!!code}`);
    console.log(`[OAuth]   error: ${error || "(none)"}`);
    console.log(`[OAuth]   AUTH_BASE_URL env: ${ENV.authBaseUrl || "(not set)"}`);

    if (error) {
      console.error(`[OAuth] Google returned error: ${error}, description: ${req.query.error_description || "(none)"}`);
      res.redirect(`/login?error=oauth_denied&detail=${encodeURIComponent(String(req.query.error_description || error))}`);
      return;
    }
    if (!code) {
      console.error("[OAuth] Missing authorization code in callback");
      res.redirect("/login?error=oauth_missing_code");
      return;
    }

    try {
      // ── Step 1: Token exchange ──
      console.log(`[OAuth] Step 1: Exchanging code for tokens. redirect_uri=${callbackUrl}`);
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        console.error(`[OAuth] Token exchange FAILED (HTTP ${tokenResponse.status})`);
        console.error(`[OAuth]   redirect_uri used: ${callbackUrl}`);
        console.error(`[OAuth]   Google response: ${errorBody.slice(0, 500)}`);

        // Parse Google error for better UX
        let errorCode = "token_exchange_failed";
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.error === "redirect_uri_mismatch") {
            errorCode = "redirect_uri_mismatch";
            console.error(`[OAuth]   ⚠ redirect_uri_mismatch — the redirect_uri sent to Google does not match what's configured in Google Console`);
            console.error(`[OAuth]   Sent: ${callbackUrl}`);
            console.error(`[OAuth]   Fix: Add "${callbackUrl}" to Google Console → APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs`);
          } else if (parsed.error === "invalid_grant") {
            errorCode = "invalid_grant";
            console.error(`[OAuth]   ⚠ invalid_grant — code already used or expired`);
          }
        } catch { /* not JSON */ }

        res.redirect(`/login?error=${errorCode}`);
        return;
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        id_token?: string;
      };
      console.log(`[OAuth] Step 1: Token exchange OK. access_token length=${tokens.access_token?.length || 0}`);

      // ── Step 2: Get user info ──
      console.log(`[OAuth] Step 2: Fetching user info from Google`);
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        const errText = await userInfoResponse.text();
        console.error(`[OAuth] UserInfo FAILED (HTTP ${userInfoResponse.status}): ${errText.slice(0, 300)}`);
        res.redirect("/login?error=userinfo_failed");
        return;
      }

      const googleUser = (await userInfoResponse.json()) as {
        id: string; email: string; name: string; picture?: string;
      };
      console.log(`[OAuth] Step 2: UserInfo OK. email=${googleUser.email}, name=${googleUser.name}, id=${googleUser.id}`);

      // ── Step 3: Upsert user in database ──
      const openId = `google_${googleUser.id}`;
      console.log(`[OAuth] Step 3: Upserting user. openId=${openId}`);

      try {
        await db.upsertUser({
          openId,
          name: googleUser.name || null,
          email: googleUser.email ?? null,
          loginMethod: "google",
          authProvider: "google",
          emailVerified: true, // Google OAuth users have verified email
          lastSignedIn: new Date(),
        });
        console.log(`[OAuth] Step 3: User upserted OK (emailVerified=true)`);
      } catch (dbErr: any) {
        console.error(`[OAuth] Step 3: Database upsert FAILED:`, dbErr.message || dbErr);
        res.redirect("/?error=db_unavailable");
        return;
      }

      // ── Step 4: Create session token ──
      console.log(`[OAuth] Step 4: Creating session token`);
      let sessionToken: string;
      try {
        sessionToken = await sdk.createSessionToken(openId, {
          name: googleUser.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        console.log(`[OAuth] Step 4: Session token created (length=${sessionToken.length})`);
      } catch (jwtErr) {
        console.error(`[OAuth] Step 4: JWT creation FAILED:`, jwtErr);
        console.error(`[OAuth]   JWT_SECRET set: ${!!ENV.cookieSecret}, length: ${ENV.cookieSecret?.length || 0}`);
        res.redirect("/login?error=session_error");
        return;
      }

      // ── Step 5: Set cookie and redirect ──
      const cookieOptions = getSessionCookieOptions(req);
      console.log(`[OAuth] Step 5: Setting cookie`);
      console.log(`[OAuth]   cookieName: ${COOKIE_NAME}`);
      console.log(`[OAuth]   domain: ${cookieOptions.domain || "(not set — browser will use current domain)"}`); 
      console.log(`[OAuth]   secure: ${cookieOptions.secure}`);
      console.log(`[OAuth]   sameSite: ${cookieOptions.sameSite}`);
      console.log(`[OAuth]   httpOnly: ${cookieOptions.httpOnly}`);
      console.log(`[OAuth]   path: ${cookieOptions.path}`);
      console.log(`[OAuth]   maxAge: ${ONE_YEAR_MS}ms (${Math.round(ONE_YEAR_MS / 86400000)} days)`);
      console.log(`[OAuth]   token length: ${sessionToken.length}`);
      console.log(`[OAuth]   token prefix: ${sessionToken.slice(0, 20)}...`);
      console.log(`[OAuth]   req.hostname: ${req.hostname}`);
      console.log(`[OAuth]   req.protocol: ${req.protocol}`);
      console.log(`[OAuth]   x-forwarded-proto: ${req.headers["x-forwarded-proto"] || "(none)"}`);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      let returnPath = "/chat";
      if (stateParam) {
        try {
          const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
          if (parsed.returnPath) returnPath = parsed.returnPath;
        } catch { /* ignore malformed state */ }
      }

      console.log(`[OAuth] ─── Callback SUCCESS ─── Redirecting to: ${returnPath}`);
      res.redirect(302, returnPath);
    } catch (err: any) {
      // Catch-all: NEVER return JSON, always redirect
      console.error(`[OAuth] ─── Callback UNHANDLED ERROR ───`);
      console.error(`[OAuth]   Error: ${err?.message || err}`);
      console.error(`[OAuth]   Stack: ${err?.stack || "(no stack)"}`);
      console.error(`[OAuth]   redirect_uri was: ${callbackUrl}`);
      console.error(`[OAuth]   AUTH_BASE_URL: ${ENV.authBaseUrl || "(not set)"}`);
      console.error(`[OAuth]   JWT_SECRET set: ${!!ENV.cookieSecret}, length: ${ENV.cookieSecret?.length || 0}`);
      console.error(`[OAuth]   DATABASE_URL set: ${!!ENV.databaseUrl}`);

      res.redirect(`/login?error=oauth_callback_failed`);
    }
  });

  // Legacy OAuth callback (disabled)
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect("/?error=legacy_oauth_disabled");
  });
}
