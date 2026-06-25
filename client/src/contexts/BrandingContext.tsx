/**
 * BrandingProvider — React Context for dynamic white-label configuration.
 * 
 * Fetches branding from GET /api/branding on mount and provides values
 * to the entire app via useBranding() hook.
 * 
 * Features:
 * - Loads once on app init (cached 60s server-side)
 * - Falls back to sensible defaults if fetch fails
 * - Provides loading state for skeleton UIs
 * - Re-fetches on window focus (stale-while-revalidate)
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

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

interface BrandingContextValue extends BrandingConfig {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ── Defaults ──
const DEFAULTS: BrandingConfig = {
  appName: "debuga.ai",
  agentName: "debuga.ai",
  companyName: "Sperry Tecnologia",
  domain: "Inteligência Operacional",
  description: "A IA que aprende como sua empresa trabalha.",
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

// ── Context ──
const BrandingContext = createContext<BrandingContextValue>({
  ...DEFAULTS,
  isLoading: true,
  error: null,
  refetch: async () => {},
});

// ── Provider ──
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch("/api/branding");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BrandingConfig = await res.json();
      setBranding(data);
      setError(null);

      // Update document title and favicon dynamically
      if (data.appName) {
        document.title = data.appName;
      }
      if (data.faviconUrl) {
        const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        if (link) {
          link.href = data.faviconUrl;
        }
      }
    } catch (err: any) {
      console.warn("[Branding] Failed to fetch:", err.message);
      setError(err.message);
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();

    // Refetch on window focus (stale-while-revalidate pattern)
    const handleFocus = () => fetchBranding();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchBranding]);

  return (
    <BrandingContext.Provider value={{ ...branding, isLoading, error, refetch: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

// ── Hook ──
export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}

// ── Utility: build WhatsApp URL ──
export function getWhatsAppUrl(number: string, message?: string): string {
  if (!number) return "";
  const cleanNumber = number.replace(/\D/g, "");
  const msg = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${cleanNumber}${msg ? `?text=${msg}` : ""}`;
}
