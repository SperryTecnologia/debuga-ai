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
  // Redirect to Google consent screen
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(500).json({ error: "GOOGLE_CLIENT_ID not configured" });
      return;
    }
    const returnPath = typeof req.query.returnPath === "string" ? req.query.returnPath : "/chat";
    const state = Buffer.from(JSON.stringify({ returnPath })).toString("base64url");
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: getCallbackUrl(req),
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

    if (error) {
      console.error("[OAuth] Google returned error:", error);
      res.redirect("/?error=oauth_denied");
      return;
    }
    if (!code) {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    try {
      console.log("[OAuth] Exchanging code for tokens...");
      const callbackUrl = getCallbackUrl(req);
      console.log(`[OAuth] Callback URL: ${callbackUrl}`);

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
        const errorText = await tokenResponse.text();
        console.error("[OAuth] Token exchange failed:", tokenResponse.status, errorText);
        res.redirect("/?error=token_exchange_failed");
        return;
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        id_token?: string;
      };
      console.log("[OAuth] Token exchange OK");

      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        console.error("[OAuth] UserInfo fetch failed:", userInfoResponse.status);
        res.redirect("/?error=userinfo_failed");
        return;
      }

      const googleUser = (await userInfoResponse.json()) as {
        id: string; email: string; name: string; picture?: string;
      };
      console.log(`[OAuth] Google user: ${googleUser.email} (${googleUser.id})`);

      const openId = `google_${googleUser.id}`;

      // Upsert user — will throw if DB is unavailable
      try {
        await db.upsertUser({
          openId,
          name: googleUser.name || null,
          email: googleUser.email ?? null,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
        console.log(`[OAuth] User upserted: ${openId}`);
      } catch (dbErr: any) {
        console.error("[OAuth] DB upsert failed:", dbErr.message);
        res.redirect("/?error=db_unavailable");
        return;
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log("[OAuth] Session cookie set OK");

      let returnPath = "/chat";
      if (stateParam) {
        try {
          const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
          if (parsed.returnPath) returnPath = parsed.returnPath;
        } catch { /* ignore */ }
      }
      console.log(`[OAuth] Redirecting to: ${returnPath}`);
      res.redirect(302, returnPath);
    } catch (err: any) {
      console.error("[OAuth] Callback failed:", err.message || err);
      console.error("[OAuth] Stack:", err.stack);
      res.redirect("/?error=oauth_internal_error");
    }
  });

  // Legacy OAuth callback (disabled)
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect("/?error=legacy_oauth_disabled");
  });
}
