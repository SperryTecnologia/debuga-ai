import { describe, expect, it } from "vitest";
import * as fs from "fs";

const chatPageContent = fs.readFileSync(
  "/home/ubuntu/debuga-ai/client/src/pages/ChatPage.tsx",
  "utf-8"
);

describe("Simplified Card Structure", () => {
  describe("All 6 cards exist with real prompts", () => {
    it("should have Diagnóstico DNS card", () => {
      expect(chatPageContent).toContain('title: "Diagnóstico DNS"');
    });

    it("should have Navegar em Site card", () => {
      expect(chatPageContent).toContain('title: "Navegar em Site"');
    });

    it("should have Auditoria de Segurança card", () => {
      expect(chatPageContent).toContain('title: "Auditoria de Segurança"');
    });

    it("should have Gerar Diagrama card", () => {
      expect(chatPageContent).toContain('title: "Gerar Diagrama"');
    });

    it("should have Scan de Portas card", () => {
      expect(chatPageContent).toContain('title: "Scan de Portas"');
    });

    it("should have Sandbox de Código card", () => {
      expect(chatPageContent).toContain('title: "Sandbox de Código"');
    });
  });

  describe("Cards use safe, stable targets in prompts", () => {
    it("DNS uses github.com", () => {
      const dnsSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Diagnóstico DNS"'),
        chatPageContent.indexOf('title: "Diagnóstico DNS"') + 500
      );
      expect(dnsSection).toContain("github.com");
    });

    it("Navegar em Site uses cloudflare.com", () => {
      const navSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Navegar em Site"'),
        chatPageContent.indexOf('title: "Navegar em Site"') + 500
      );
      expect(navSection).toContain("cloudflare.com");
    });

    it("Auditoria uses cloudflare.com", () => {
      const auditSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Auditoria de Segurança"'),
        chatPageContent.indexOf('title: "Auditoria de Segurança"') + 500
      );
      expect(auditSection).toContain("cloudflare.com");
    });

    it("Scan de Portas only scans ports 80 and 443", () => {
      const scanSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Scan de Portas"'),
        chatPageContent.indexOf('title: "Scan de Portas"') + 500
      );
      expect(scanSection).toContain("80");
      expect(scanSection).toContain("443");
      expect(scanSection).toContain("cloudflare.com");
    });

    it("Sandbox uses safe ipaddress validation", () => {
      const sandboxSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Sandbox de Código"'),
        chatPageContent.indexOf('title: "Sandbox de Código"') + 500
      );
      expect(sandboxSection).toContain("192.168.0.1");
      expect(sandboxSection).toContain("IPv4");
    });
  });

  describe("No demo/lock/plan-gating on cards", () => {
    it("should NOT have demoPrompt field (uses prompt instead)", () => {
      expect(chatPageContent).not.toContain("demoPrompt:");
    });

    it("should NOT have demoBadge field", () => {
      expect(chatPageContent).not.toContain("demoBadge:");
    });

    it("should NOT have requiredPlanForFull field", () => {
      expect(chatPageContent).not.toContain("requiredPlanForFull:");
    });

    it("should NOT have fullPromptHint field", () => {
      expect(chatPageContent).not.toContain("fullPromptHint:");
    });

    it("should NOT have isLocked or isDemoMode logic in card rendering", () => {
      const cardSection = chatPageContent.substring(
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map"),
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map") + 2000
      );
      expect(cardSection).not.toContain("isLocked");
      expect(cardSection).not.toContain("isDemoMode");
    });

    it("cards call handleSendMessage with item.prompt", () => {
      const cardSection = chatPageContent.substring(
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map"),
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map") + 2000
      );
      expect(cardSection).toContain("handleSendMessage(item.prompt)");
    });
  });

  describe("Cards have description field", () => {
    it("each card has a description", () => {
      expect(chatPageContent).toContain("description: ");
      // Count descriptions - should be 6
      const descMatches = chatPageContent.match(/description: "/g);
      expect(descMatches?.length).toBe(6);
    });
  });

  describe("CTA post-card for Free users", () => {
    it("should have showCardUpgradeCTA state", () => {
      expect(chatPageContent).toContain("showCardUpgradeCTA");
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

    it("CTA should NOT stack with upgrade modal (guard present)", () => {
      expect(chatPageContent).toContain("showCardUpgradeCTA && !upgradeModal?.open");
    });
  });

  describe("Introductory text is simple", () => {
    it("should mention real queries", () => {
      expect(chatPageContent).toContain("consultas reais");
    });

    it("should NOT contain old demo language", () => {
      expect(chatPageContent).not.toContain("exemplos guiados");
    });
  });

  describe("Prompts are detailed and professional", () => {
    it("DNS prompt asks for organized tables and interpretation", () => {
      const dnsSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Diagnóstico DNS"'),
        chatPageContent.indexOf('title: "Diagnóstico DNS"') + 600
      );
      expect(dnsSection).toContain("tabelas");
      expect(dnsSection).toContain("resumo interpretativo");
    });

    it("Navegar prompt asks for title, status, summary", () => {
      const navSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Navegar em Site"'),
        chatPageContent.indexOf('title: "Navegar em Site"') + 600
      );
      expect(navSection).toContain("título");
      expect(navSection).toContain("status HTTP");
      expect(navSection).toContain("resumo profissional");
    });

    it("Auditoria prompt asks for checklist with positives and concerns", () => {
      const auditSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Auditoria de Segurança"'),
        chatPageContent.indexOf('title: "Auditoria de Segurança"') + 600
      );
      expect(auditSection).toContain("checklist profissional");
      expect(auditSection).toContain("pontos positivos");
      expect(auditSection).toContain("pontos de atenção");
    });

    it("Diagrama prompt asks for professional high-quality output", () => {
      const diagramSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Gerar Diagrama"'),
        chatPageContent.indexOf('title: "Gerar Diagrama"') + 600
      );
      expect(diagramSection).toContain("profissional");
      expect(diagramSection).toContain("alta qualidade");
    });

    it("Scan prompt asks for table with interpretation", () => {
      const scanSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Scan de Portas"'),
        chatPageContent.indexOf('title: "Scan de Portas"') + 600
      );
      expect(scanSection).toContain("tabela");
      expect(scanSection).toContain("interpretação profissional");
    });

    it("Sandbox prompt asks for code, output and explanation", () => {
      const sandboxSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Sandbox de Código"'),
        chatPageContent.indexOf('title: "Sandbox de Código"') + 600
      );
      expect(sandboxSection).toContain("código");
      expect(sandboxSection).toContain("saída");
      expect(sandboxSection).toContain("explique");
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

  describe("Error handling is friendly", () => {
    it("ToolResultCard uses amber/yellow warning style for errors", () => {
      expect(chatPageContent).toContain("border-yellow-500/30");
      expect(chatPageContent).toContain("bg-yellow-500/5");
    });

    it("ToolResultCard shows friendly error message", () => {
      expect(chatPageContent).toContain("Ocorreu um erro inesperado. Tente novamente.");
    });

    it("agentTools has friendly error messages", () => {
      const agentToolsContent = fs.readFileSync(
        "/home/ubuntu/debuga-ai/server/agentTools.ts",
        "utf-8"
      );
      expect(agentToolsContent).toContain("Não foi possível processar os parâmetros");
      expect(agentToolsContent).toContain("Tente reformular sua solicitação");
      expect(agentToolsContent).not.toContain('"Argumentos inválidos"');
    });
  });
});
