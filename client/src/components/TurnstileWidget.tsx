import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from "react";

/**
 * Cloudflare Turnstile CAPTCHA widget — execute-on-submit mode.
 *
 * Key behaviors:
 * - Widget is rendered in "execution" mode: invisible until triggered
 * - Parent calls ref.execute() to start verification on demand (e.g., on form submit)
 * - Parent calls ref.reset() to invalidate current token and prepare for next attempt
 * - No automatic verification on mount — avoids premature token expiration
 * - Token is single-use: after each submit (success or failure), parent must reset
 * - Detailed console logging with [Turnstile] prefix
 */

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// ── Singleton script loader ──
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).turnstile) {
      console.log("[Turnstile] script already available");
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src*="challenges.cloudflare.com/turnstile"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        console.log("[Turnstile] script loaded (existing tag)");
        resolve();
      });
      existing.addEventListener("error", () => {
        console.error("[Turnstile] script failed to load (existing tag)");
        scriptLoadPromise = null;
        reject(new Error("Script load failed"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      console.log("[Turnstile] script loaded");
      resolve();
    };
    script.onerror = () => {
      console.error("[Turnstile] script failed to load");
      scriptLoadPromise = null;
      reject(new Error("Script load failed"));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

// ── Types ──
export type TurnstileStatus = "idle" | "loading" | "ready" | "executing" | "verified" | "error" | "expired" | "timeout" | "not_configured";

export interface TurnstileHandle {
  /** Execute the Turnstile challenge. Returns the token or throws on failure. */
  execute: () => Promise<string>;
  /** Reset the widget to prepare for a new execution. */
  reset: () => void;
  /** Current status */
  getStatus: () => TurnstileStatus;
}

interface TurnstileWidgetProps {
  /** Called when a fresh token is received */
  onVerify?: (token: string) => void;
  /** Called on status change */
  onStatusChange?: (status: TurnstileStatus) => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "invisible";
}

/** Whether Turnstile is configured (site key available in the frontend build) */
export function isTurnstileEnabled(): boolean {
  return !!TURNSTILE_SITE_KEY;
}

const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onVerify, onStatusChange, theme = "auto", size = "normal" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const mountedRef = useRef(true);
    const scriptReadyRef = useRef(false);
    const [status, setStatus] = useState<TurnstileStatus>(
      TURNSTILE_SITE_KEY ? "idle" : "not_configured"
    );

    // Promise resolver for execute() calls
    const resolveRef = useRef<((token: string) => void) | null>(null);
    const rejectRef = useRef<((err: Error) => void) | null>(null);

    // Stable refs for callbacks
    const onVerifyRef = useRef(onVerify);
    const onStatusChangeRef = useRef(onStatusChange);
    onVerifyRef.current = onVerify;
    onStatusChangeRef.current = onStatusChange;

    const updateStatus = useCallback((newStatus: TurnstileStatus) => {
      if (!mountedRef.current) return;
      setStatus(newStatus);
      onStatusChangeRef.current?.(newStatus);
    }, []);

    // ── Render widget (managed mode — does NOT auto-execute) ──
    const renderWidget = useCallback(() => {
      if (!containerRef.current || !TURNSTILE_SITE_KEY) return;

      const win = window as any;
      if (!win.turnstile) {
        console.error("[Turnstile] window.turnstile not available after script load");
        updateStatus("error");
        return;
      }

      // Remove previous widget if any
      if (widgetIdRef.current !== null) {
        try { win.turnstile.remove(widgetIdRef.current); } catch { /* ok */ }
        widgetIdRef.current = null;
      }

      console.log("[Turnstile] rendering widget (managed mode)", { sitekey: TURNSTILE_SITE_KEY.slice(0, 8) + "...", theme, size });

      try {
        const id = win.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme,
          size,
          execution: "execute", // Managed mode — won't auto-verify
          appearance: "execute", // Widget appears only when executing
          callback: (token: string) => {
            console.log("[Turnstile] verified — fresh token received");
            updateStatus("verified");
            onVerifyRef.current?.(token);
            // Resolve the execute() promise
            if (resolveRef.current) {
              resolveRef.current(token);
              resolveRef.current = null;
              rejectRef.current = null;
            }
          },
          "expired-callback": () => {
            console.log("[Turnstile] token expired");
            updateStatus("expired");
            if (rejectRef.current) {
              rejectRef.current(new Error("Token expired"));
              resolveRef.current = null;
              rejectRef.current = null;
            }
          },
          "error-callback": (errorCode?: string) => {
            const code = errorCode || "unknown";
            console.error("[Turnstile] error-callback fired", { errorCode: code });
            updateStatus("error");
            if (rejectRef.current) {
              rejectRef.current(new Error(`Turnstile error: ${code}`));
              resolveRef.current = null;
              rejectRef.current = null;
            }
          },
          "timeout-callback": () => {
            console.warn("[Turnstile] timeout-callback fired");
            updateStatus("timeout");
            if (rejectRef.current) {
              rejectRef.current(new Error("Turnstile timeout"));
              resolveRef.current = null;
              rejectRef.current = null;
            }
          },
        });

        widgetIdRef.current = id;
        console.log("[Turnstile] ready (widget id:", id, ")");
        updateStatus("ready");
      } catch (err: any) {
        console.error("[Turnstile] render threw:", err);
        updateStatus("error");
      }
    }, [theme, size, updateStatus]);

    // ── Load script and render on mount ──
    useEffect(() => {
      if (!TURNSTILE_SITE_KEY) {
        updateStatus("not_configured");
        return;
      }

      mountedRef.current = true;
      updateStatus("loading");

      loadTurnstileScript()
        .then(() => {
          if (mountedRef.current) {
            scriptReadyRef.current = true;
            renderWidget();
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            updateStatus("error");
          }
        });

      return () => {
        mountedRef.current = false;
        // Cleanup widget on unmount
        if (widgetIdRef.current !== null && (window as any).turnstile) {
          try { (window as any).turnstile.remove(widgetIdRef.current); } catch { /* ok */ }
          widgetIdRef.current = null;
        }
        // Reject any pending promise
        if (rejectRef.current) {
          rejectRef.current(new Error("Component unmounted"));
          resolveRef.current = null;
          rejectRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Imperative handle for parent ──
    useImperativeHandle(ref, () => ({
      execute: () => {
        return new Promise<string>((resolve, reject) => {
          const win = window as any;

          if (!TURNSTILE_SITE_KEY) {
            // If not configured, resolve with empty (backend should skip validation)
            resolve("");
            return;
          }

          if (!win.turnstile || widgetIdRef.current === null) {
            reject(new Error("Turnstile widget not ready"));
            return;
          }

          console.log("[Turnstile] execute requested");
          updateStatus("executing");

          // Store promise handlers
          resolveRef.current = resolve;
          rejectRef.current = reject;

          // Execute the challenge
          try {
            win.turnstile.execute(containerRef.current, {
              // This triggers the challenge for the managed widget
            });
          } catch (err: any) {
            console.error("[Turnstile] execute threw:", err);
            updateStatus("error");
            resolveRef.current = null;
            rejectRef.current = null;
            reject(err);
          }

          // Safety timeout: if no callback fires within 30s, reject
          setTimeout(() => {
            if (resolveRef.current === resolve) {
              console.warn("[Turnstile] execute timeout (30s)");
              updateStatus("timeout");
              resolveRef.current = null;
              rejectRef.current = null;
              reject(new Error("Turnstile verification timeout"));
            }
          }, 30000);
        });
      },

      reset: () => {
        const win = window as any;
        if (widgetIdRef.current !== null && win.turnstile) {
          console.log("[Turnstile] reset");
          try {
            win.turnstile.reset(widgetIdRef.current);
            updateStatus("ready");
          } catch (err) {
            console.warn("[Turnstile] reset failed, re-rendering:", err);
            renderWidget();
          }
        } else if (scriptReadyRef.current) {
          renderWidget();
        }
        // Clear any pending promise
        if (rejectRef.current) {
          rejectRef.current(new Error("Reset called"));
          resolveRef.current = null;
          rejectRef.current = null;
        }
      },

      getStatus: () => status,
    }), [status, updateStatus, renderWidget]);

    // ── Not configured — render nothing ──
    if (!TURNSTILE_SITE_KEY) return null;

    return (
      <div className="my-2">
        {/* Widget container — invisible until execute() is called */}
        <div
          ref={containerRef}
          className="flex justify-center"
          data-testid="turnstile-widget"
        />

        {/* Status indicators */}
        {status === "executing" && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Verificando...</span>
          </div>
        )}

        {status === "verified" && (
          <div className="flex items-center justify-center gap-1 text-sm text-green-600 py-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Verificação concluída</span>
          </div>
        )}
      </div>
    );
  }
);

export default TurnstileWidget;
