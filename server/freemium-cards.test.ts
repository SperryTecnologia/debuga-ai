import { describe, expect, it } from "vitest";
import * as fs from "fs";

const chatPageContent = fs.readFileSync(
  "/home/ubuntu/debuga-ai/client/src/pages/ChatPage.tsx",
  "utf-8"
);

describe("Freemium Card Structure", () => {
  describe("All 6 cards have demo mode", () => {
    it("should have Diagnóstico DNS card with demoPrompt", () => {
      expect(chatPageContent).toContain('title: "Diagnóstico DNS"');
      expect(chatPageContent).toContain("demoPrompt:");
    });

    it("should have Navegar em Site card with demoPrompt", () => {
      expect(chatPageContent).toContain('title: "Navegar em Site"');
    });

    it("should have Auditoria de Segurança card with demoPrompt", () => {
      expect(chatPageContent).toContain('title: "Auditoria de Segurança"');
    });

    it("should have Gerar Diagrama card with demoPrompt", () => {
      expect(chatPageContent).toContain('title: "Gerar Diagrama"');
    });

    it("should have Scan de Portas card with demoPrompt", () => {
      expect(chatPageContent).toContain('title: "Scan de Portas"');
    });

    it("should have Sandbox de Código card with demoPrompt", () => {
      expect(chatPageContent).toContain('title: "Sandbox de Código"');
    });
  });

  describe("Demo prompts use safe, stable targets", () => {
    it("DNS demo uses github.com", () => {
      const dnsSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Diagnóstico DNS"'),
        chatPageContent.indexOf('title: "Diagnóstico DNS"') + 800
      );
      expect(dnsSection).toContain("github.com");
    });

    it("Navegar em Site demo uses cloudflare.com", () => {
      const navSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Navegar em Site"'),
        chatPageContent.indexOf('title: "Navegar em Site"') + 800
      );
      expect(navSection).toContain("cloudflare.com");
    });

    it("Auditoria demo uses cloudflare.com", () => {
      const auditSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Auditoria de Segurança"'),
        chatPageContent.indexOf('title: "Auditoria de Segurança"') + 800
      );
      expect(auditSection).toContain("cloudflare.com");
    });

    it("Scan de Portas demo uses scanme.nmap.org", () => {
      const scanSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Scan de Portas"'),
        chatPageContent.indexOf('title: "Scan de Portas"') + 800
      );
      expect(scanSection).toContain("scanme.nmap.org");
      expect(scanSection).toContain("80");
      expect(scanSection).toContain("443");
    });

    it("Sandbox demo uses safe ipaddress network analysis", () => {
      const sandboxSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Sandbox de Código"'),
        chatPageContent.indexOf('title: "Sandbox de Código"') + 800
      );
      expect(sandboxSection).toContain("192.168.1.0/24");
      expect(sandboxSection).toContain("ipaddress");
    });
  });

  describe("No cards are locked/blocked for Free users", () => {
    it("should not have isLocked logic that blocks card clicks", () => {
      const cardSection = chatPageContent.substring(
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map"),
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map") + 2000
      );
      expect(cardSection).not.toContain("if (isLocked)");
      // Cards now send with isDemo flag
      expect(cardSection).toContain("handleSendMessage(item.demoPrompt, { isDemo: true })");
    });
  });

  describe("Cards have commercial badges", () => {
    it("should use 'Demonstração' badge for main tools", () => {
      expect(chatPageContent).toContain('demoBadge: "Demonstração"');
    });

    it("should use 'Demo segura' badge for sensitive tools", () => {
      expect(chatPageContent).toContain('demoBadge: "Demo segura"');
    });

    it("should not show Lock icon on demo cards", () => {
      const cardSection = chatPageContent.substring(
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map"),
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map") + 2000
      );
      expect(cardSection).not.toContain("<Lock");
    });
  });

  describe("Demo upgrade CTA", () => {
    it("should have showDemoUpgradeCTA state", () => {
      expect(chatPageContent).toContain("showDemoUpgradeCTA");
    });

    it("should show 'Gostou do resultado?' dialog", () => {
      expect(chatPageContent).toContain("Gostou do resultado?");
    });

    it("should have 'Continuar testando' button", () => {
      expect(chatPageContent).toContain("Continuar testando");
    });

    it("should have 'Fazer Upgrade' button", () => {
      expect(chatPageContent).toContain("Fazer Upgrade");
    });

    it("CTA should not show when upgrade modal is open", () => {
      expect(chatPageContent).toContain("showDemoUpgradeCTA && !upgradeModal?.open");
    });
  });

  describe("Demo Mode integration", () => {
    it("cards send isDemo flag to handleSendMessage", () => {
      expect(chatPageContent).toContain("{ isDemo: true }");
    });

    it("handleSendMessage accepts isDemo option", () => {
      expect(chatPageContent).toContain("options?: { isDemo?: boolean }");
    });

    it("isDemo flag is sent in the fetch body", () => {
      expect(chatPageContent).toContain("isDemo: true");
    });

    it("done event triggers CTA for demo mode", () => {
      expect(chatPageContent).toContain("parsed.isDemo && !upgradeModal?.open");
    });
  });

  describe("Introductory text updated", () => {
    it("should mention guided examples", () => {
      expect(chatPageContent).toContain("exemplos guiados");
    });

    it("should mention upgrade for custom domains", () => {
      expect(chatPageContent).toContain("seus próprios domínios");
    });
  });

  describe("Each card has fullPromptHint for upgrade path", () => {
    it("DNS card hints at using any domain", () => {
      expect(chatPageContent).toContain("use qualquer domínio");
    });

    it("Navegar em Site hints at any URL", () => {
      expect(chatPageContent).toContain("navegue em qualquer URL");
    });

    it("Auditoria hints at any domain", () => {
      expect(chatPageContent).toContain("audite qualquer domínio");
    });

    it("Diagrama hints at custom diagrams", () => {
      expect(chatPageContent).toContain("diagramas personalizados");
    });

    it("Scan hints at any target", () => {
      expect(chatPageContent).toContain("escaneie qualquer alvo");
    });

    it("Sandbox hints at custom code", () => {
      expect(chatPageContent).toContain("código personalizado");
    });
  });

  describe("No prices displayed in upgrade modal", () => {
    it("should not contain R$ in upgrade modal", () => {
      const modalSection = chatPageContent.substring(
        chatPageContent.indexOf("Upgrade Modal"),
        chatPageContent.indexOf("Delete confirmation dialog")
      );
      expect(modalSection).not.toContain("R$");
    });
  });

  describe("Stripe and pricing untouched", () => {
    it("should not modify products.ts", () => {
      const productsContent = fs.readFileSync(
        "/home/ubuntu/debuga-ai/server/products.ts",
        "utf-8"
      );
      expect(productsContent).toContain("free");
      expect(productsContent).toContain("starter");
      expect(productsContent).toContain("pro");
    });
  });
});
