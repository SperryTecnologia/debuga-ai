export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Generate login URL.
 * When ENABLE_LOCAL_LOGIN=true, this goes to /login page.
 * The /login page shows both local auth and Google OAuth options.
 */
export const getLoginUrl = (returnPath?: string) => {
  const params = new URLSearchParams();
  if (returnPath) params.set("returnPath", returnPath);
  const qs = params.toString();
  return `/login${qs ? "?" + qs : ""}`;
};

/**
 * Generate Google OAuth URL directly (used from LoginPage).
 */
export const getGoogleOAuthUrl = (returnPath?: string) => {
  const origin = window.location.origin;
  const params = new URLSearchParams();
  if (returnPath) params.set("returnPath", returnPath);
  return `${origin}/api/auth/google?${params.toString()}`;
};
