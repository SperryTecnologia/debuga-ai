import { describe, expect, it, vi, beforeEach } from "vitest";
import { invalidateBrandingCache, getBranding } from "./branding";
import { invalidateIdentityCache, getAgentIdentity, DEFAULT_IDENTITY } from "./agentIdentityLoader";

// Mock the DB module
vi.mock("./db", () => ({
  getAppSettings: vi.fn(),
}));

import { getAppSettings } from "./db";
const mockGetAppSettings = vi.mocked(getAppSettings);

describe("Branding and Identity Cache", () => {
  beforeEach(() => {
    // Reset caches before each test
    invalidateBrandingCache();
    invalidateIdentityCache();
    vi.clearAllMocks();
  });

  describe("getBranding", () => {
    it("returns defaults when DB returns null", async () => {
      mockGetAppSettings.mockResolvedValue(null);
      const branding = await getBranding();
      expect(branding.appName).toBe("debuga.ai");
      expect(branding.companyName).toBe("Sperry Tecnologia");
    });

    it("returns DB values when they exist", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: "MyApp",
        agentName: "MyAgent",
        legalCompanyName: "MyCompany",
        niche: "Cloud Computing",
        landingSubtitle: "My Description",
        primaryColor: "#ff0000",
        logoUrl: "https://example.com/logo.png",
        faviconUrl: "",
        supportEmail: "test@test.com",
        supportWhatsapp: "5511999999999",
        welcomeMessage: "Hello",
        institutionalLinks: { footerText: "Footer", githubUrl: "https://github.com/test" },
        landingTitle: null,
        termsUrl: "/terms",
        privacyUrl: "/privacy",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const branding = await getBranding();
      expect(branding.appName).toBe("MyApp");
      expect(branding.agentName).toBe("MyAgent");
      expect(branding.companyName).toBe("MyCompany");
      expect(branding.domain).toBe("Cloud Computing");
    });

    it("falls back to defaults when DB values are empty strings", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: "",
        agentName: "",
        legalCompanyName: "",
        niche: "",
        landingSubtitle: "",
        primaryColor: "",
        logoUrl: "",
        faviconUrl: "",
        supportEmail: "",
        supportWhatsapp: "",
        welcomeMessage: "",
        institutionalLinks: {},
        landingTitle: null,
        termsUrl: "",
        privacyUrl: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const branding = await getBranding();
      expect(branding.appName).toBe("debuga.ai");
      expect(branding.agentName).toBe("debuga.ai");
      expect(branding.companyName).toBe("Sperry Tecnologia");
    });

    it("falls back to defaults when DB values are null", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: null,
        agentName: null,
        legalCompanyName: null,
        niche: null,
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const branding = await getBranding();
      expect(branding.appName).toBe("debuga.ai");
      expect(branding.agentName).toBe("debuga.ai");
      expect(branding.companyName).toBe("Sperry Tecnologia");
    });

    it("invalidates cache correctly", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: "First",
        agentName: "First",
        legalCompanyName: "First Co",
        niche: null,
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      
      const first = await getBranding();
      expect(first.appName).toBe("First");

      // Change DB value
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: "Second",
        agentName: "Second",
        legalCompanyName: "Second Co",
        niche: null,
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Without invalidation, cache returns old value
      const cached = await getBranding();
      expect(cached.appName).toBe("First");

      // After invalidation, returns new value
      invalidateBrandingCache();
      const refreshed = await getBranding();
      expect(refreshed.appName).toBe("Second");
    });
  });

  describe("getAgentIdentity", () => {
    it("returns defaults when DB returns null", async () => {
      mockGetAppSettings.mockResolvedValue(null);
      const identity = await getAgentIdentity();
      expect(identity.agentName).toBe(DEFAULT_IDENTITY.agentName);
      expect(identity.companyName).toBe(DEFAULT_IDENTITY.companyName);
      expect(identity.domain).toBe(DEFAULT_IDENTITY.domain);
    });

    it("returns DB values when they exist", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: "MyApp",
        agentName: "CustomAgent",
        legalCompanyName: "CustomCompany",
        niche: "Cloud Security",
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const identity = await getAgentIdentity();
      expect(identity.agentName).toBe("CustomAgent");
      expect(identity.companyName).toBe("CustomCompany");
      expect(identity.domain).toBe("Cloud Security");
    });

    it("falls back to defaults when agentName is empty/null", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: null,
        agentName: null,
        legalCompanyName: null,
        niche: null,
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const identity = await getAgentIdentity();
      expect(identity.agentName).toBe(DEFAULT_IDENTITY.agentName);
      expect(identity.companyName).toBe(DEFAULT_IDENTITY.companyName);
    });

    it("falls back to appName when agentName is empty but appName exists", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: "FallbackApp",
        agentName: "",
        legalCompanyName: null,
        niche: null,
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const identity = await getAgentIdentity();
      expect(identity.agentName).toBe("FallbackApp");
    });

    it("invalidates cache correctly", async () => {
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: null,
        agentName: "OldAgent",
        legalCompanyName: "OldCo",
        niche: null,
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      
      const first = await getAgentIdentity();
      expect(first.agentName).toBe("OldAgent");

      // Simulate clearing the field (NULL in DB after save)
      mockGetAppSettings.mockResolvedValue({
        id: 1,
        tenantId: "default",
        appName: null,
        agentName: null,
        legalCompanyName: null,
        niche: null,
        landingSubtitle: null,
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        supportEmail: null,
        supportWhatsapp: null,
        welcomeMessage: null,
        institutionalLinks: null,
        landingTitle: null,
        termsUrl: null,
        privacyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Without invalidation, cache returns old value
      const cached = await getAgentIdentity();
      expect(cached.agentName).toBe("OldAgent");

      // After invalidation, returns fallback (since DB is now null)
      invalidateIdentityCache();
      const refreshed = await getAgentIdentity();
      expect(refreshed.agentName).toBe(DEFAULT_IDENTITY.agentName);
      expect(refreshed.companyName).toBe(DEFAULT_IDENTITY.companyName);
    });
  });
});
