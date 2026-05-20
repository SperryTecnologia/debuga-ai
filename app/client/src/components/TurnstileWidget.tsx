import { useEffect, useRef, useCallback } from "react";

/**
 * Cloudflare Turnstile CAPTCHA widget.
 * Only renders if VITE_TURNSTILE_SITE_KEY is set.
 * Gracefully degrades to nothing if not configured.
 */

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
}

/** Whether Turnstile is configured (site key available) */
export function isTurnstileEnabled(): boolean {
  return !!TURNSTILE_SITE_KEY;
}

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  size = "normal",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !TURNSTILE_SITE_KEY) return;
    if (widgetIdRef.current !== null) return; // Already rendered

    const win = window as any;
    if (!win.turnstile) return;

    widgetIdRef.current = win.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme,
      size,
      callback: (token: string) => onVerify(token),
      "expired-callback": () => {
        onExpire?.();
        // Reset widget for re-verification
        if (widgetIdRef.current !== null) {
          win.turnstile.reset(widgetIdRef.current);
        }
      },
      "error-callback": () => {
        onError?.();
      },
    });
  }, [onVerify, onExpire, onError, theme, size]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    // Load Turnstile script if not already loaded
    const existingScript = document.querySelector(`script[src*="turnstile"]`);
    if (existingScript) {
      // Script already loaded, render widget
      if ((window as any).turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener("load", renderWidget);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `${TURNSTILE_SCRIPT_URL}?render=explicit`;
    script.async = true;
    script.defer = true;
    script.onload = () => renderWidget();
    document.head.appendChild(script);

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current !== null && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  // Don't render anything if not configured
  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div
      ref={containerRef}
      className="flex justify-center my-2"
      data-testid="turnstile-widget"
    />
  );
}
