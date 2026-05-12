import { describe, expect, it } from "vitest";
import * as fs from "fs";

const chatPageContent = fs.readFileSync(
  "/home/ubuntu/debuga-ai/client/src/pages/ChatPage.tsx",
  "utf-8"
);

describe("Simplified Card Structure", () => {
  describe("All 8 cards exist (6 visible + 2 hidden)", () => {
    it("should have Diagnóstico DNS card", () => {
      expect(chatPageContent).toContain('title: "Diagnóstico DNS"');
    });

    it("should have Auditoria de Segurança card", () => {
      expect(chatPageContent).toContain('title: "Auditoria de Segurança"');
    });

    it("should have Scan de Portas card", () => {
      expect(chatPageContent).toContain('title: "Scan de Portas"');
    });

    it("should have Monitor de Servidor card (hidden)", () => {
      expect(chatPageContent).toContain('title: "Monitor de Servidor"');
      const monitorSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Monitor de Servidor"'),
        chatPageContent.indexOf('title: "Monitor de Servidor"') + 200
      );
      expect(monitorSection).toContain("visible: false");
    });

    it("should have Auditor de Domínio card", () => {
      expect(chatPageContent).toContain('title: "Auditor de Domínio"');
    });

    it("should have Gerar Diagrama card (visible)", () => {
      expect(chatPageContent).toContain('title: "Gerar Diagrama"');
      // Gerar Diagrama should NOT have visible: false (it's visible)
      const diagramSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Gerar Diagrama"'),
        chatPageContent.indexOf('title: "Gerar Diagrama"') + 200
      );
      expect(diagramSection).not.toContain("visible: false");
    });

    it("should have Navegar em Site card (hidden)", () => {
      expect(chatPageContent).toContain('title: "Navegar em Site"');
      const navSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Navegar em Site"'),
        chatPageContent.indexOf('title: "Navegar em Site"') + 200
      );
      expect(navSection).toContain("visible: false");
    });

    it("should have Sandbox de Código card (hidden)", () => {
      expect(chatPageContent).toContain('title: "Sandbox de Código"');
      const sandboxSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Sandbox de Código"'),
        chatPageContent.indexOf('title: "Sandbox de Código"') + 200
      );
      expect(sandboxSection).toContain("visible: false");
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

    it("Monitor de Servidor uses 161.97.132.110", () => {
      const monitorSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Monitor de Servidor"'),
        chatPageContent.indexOf('title: "Monitor de Servidor"') + 1200
      );
      expect(monitorSection).toContain("161.97.132.110");
    });

    it("Auditor de Domínio uses debuga.ai", () => {
      const auditorSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Auditor de Domínio"'),
        chatPageContent.indexOf('title: "Auditor de Domínio"') + 800
      );
      expect(auditorSection).toContain("debuga.ai");
    });

    it("Auditoria uses example.com (not cloudflare.com)", () => {
      const auditSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Auditoria de Segurança"'),
        chatPageContent.indexOf('title: "Auditoria de Segurança"') + 500
      );
      expect(auditSection).toContain("example.com");
      expect(auditSection).not.toContain("cloudflare.com");
    });

    it("Scan de Portas uses example.com with only ports 80 and 443", () => {
      const scanSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Scan de Portas"'),
        chatPageContent.indexOf('title: "Scan de Portas"') + 500
      );
      expect(scanSection).toContain("80");
      expect(scanSection).toContain("443");
      expect(scanSection).toContain("example.com");
      expect(scanSection).not.toContain("cloudflare.com");
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
        chatPageContent.indexOf("SUGGESTED_PROMPTS.map") !== -1
          ? chatPageContent.indexOf("SUGGESTED_PROMPTS.map")
          : chatPageContent.indexOf("SUGGESTED_PROMPTS.filter"),
        (chatPageContent.indexOf("SUGGESTED_PROMPTS.map") !== -1
          ? chatPageContent.indexOf("SUGGESTED_PROMPTS.map")
          : chatPageContent.indexOf("SUGGESTED_PROMPTS.filter")) + 2000
      );
      expect(cardSection).not.toContain("isLocked");
      expect(cardSection).not.toContain("isDemoMode");
    });

    it("cards call handleSendMessage with item.prompt and item.displayMessage", () => {
      const cardSection = chatPageContent.substring(
        chatPageContent.indexOf("SUGGESTED_PROMPTS.filter"),
        chatPageContent.indexOf("SUGGESTED_PROMPTS.filter") + 2000
      );
      expect(cardSection).toContain("handleSendMessage(item.prompt, item.displayMessage)");
    });
  });

  describe("Cards have description field", () => {
    it("each card has a description (8 total: 6 visible + 2 hidden)", () => {
      expect(chatPageContent).toContain("description: ");
      const descMatches = chatPageContent.match(/description: "/g);
      expect(descMatches?.length).toBe(8);
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

  describe("Introductory text and unified accordion", () => {
    it("should have unified accordion toggle for examples", () => {
      expect(chatPageContent).toContain("examplesOpen");
    });

    it("accordion has toggle text", () => {
      expect(chatPageContent).toContain("Ver exemplos guiados");
      expect(chatPageContent).toContain("Ocultar exemplos");
    });

    it("cards are filtered by visible property", () => {
      expect(chatPageContent).toContain("filter(p => p.visible !== false)");
    });
  });

  describe("Prompts are detailed and professional", () => {
    it("DNS prompt asks for organized sections and interpretation", () => {
      const dnsSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Diagnóstico DNS"'),
        chatPageContent.indexOf('title: "Diagnóstico DNS"') + 600
      );
      expect(dnsSection).toContain("seções");
      expect(dnsSection).toContain("conclusão profissional");
    });

    it("Monitor de Servidor prompt enforces evidence-based verification", () => {
      const monitorSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Monitor de Servidor"'),
        chatPageContent.indexOf('title: "Monitor de Servidor"') + 2500
      );
      expect(monitorSection).toContain("161.97.132.110");
      expect(monitorSection).toContain("defensiva");
      expect(monitorSection).toContain("REGRA CR\u00cdTICA DE EVID\u00caNCIA");
      expect(monitorSection).toContain("NUNCA invente portas");
      expect(monitorSection).toContain("NUNCA liste portas comuns");
      expect(monitorSection).toContain("expected_services");
      expect(monitorSection).toContain("verified_open_ports");
      expect(monitorSection).toContain("unverified");
      expect(monitorSection).toContain("evidence_level");
      expect(monitorSection).toContain("hardening");
    });

    it("Auditor de Domínio prompt asks for DNS, SPF, DMARC analysis", () => {
      const auditorSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Auditor de Domínio"'),
        chatPageContent.indexOf('title: "Auditor de Domínio"') + 1200
      );
      expect(auditorSection).toContain("SPF");
      expect(auditorSection).toContain("DMARC");
      expect(auditorSection).toContain("pontos positivos");
      expect(auditorSection).toContain("recomendações");
    });

    it("Diagrama prompt has Mermaid fallback", () => {
      const diagramStart = chatPageContent.indexOf('title: "Gerar Diagrama"');
      const diagramSection = chatPageContent.substring(
        diagramStart,
        diagramStart + 5000
      );
      expect(diagramSection).toContain("profissional");
      expect(diagramSection).toContain("Mermaid");
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

    it("Scan prompt asks for professional interpretation", () => {
      const scanSection = chatPageContent.substring(
        chatPageContent.indexOf('title: "Scan de Portas"'),
        chatPageContent.indexOf('title: "Scan de Portas"') + 600
      );
      expect(scanSection).toContain("interpretação profissional");
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
    it("ToolResultCard handles internal errors gracefully (no card rendered)", () => {
      expect(chatPageContent).toContain("_internalError");
    });

    it("ToolResultCard sanitizes technical terms from error messages", () => {
      expect(chatPageContent).toContain("Sanitize: remove any technical terms");
    });

    it("agentTools has friendly error messages for parse/validation failures", () => {
      const agentToolsContent = fs.readFileSync(
        "/home/ubuntu/debuga-ai/server/agentTools.ts",
        "utf-8"
      );
      expect(agentToolsContent).toContain("Parâmetros inválidos");
      expect(agentToolsContent).toContain("tentará novamente");
      expect(agentToolsContent).not.toContain('"Argumentos inválidos"');
    });

    it("agentTools marks parse/validation errors as _internalError", () => {
      const agentToolsContent = fs.readFileSync(
        "/home/ubuntu/debuga-ai/server/agentTools.ts",
        "utf-8"
      );
      expect(agentToolsContent).toContain("_internalError: true");
      expect(agentToolsContent).toContain("_retryable: true");
    });
  });

  describe("Stream timeout prevents infinite loading", () => {
    it("should have stream timeout mechanism", () => {
      expect(chatPageContent).toContain("STREAM_TIMEOUT_MS");
    });

    it("should show friendly message on timeout", () => {
      expect(chatPageContent).toContain("demorou mais do que o esperado");
    });

    it("should have streamTimedOut state", () => {
      expect(chatPageContent).toContain("streamTimedOut");
    });
  });

  describe("Conversation not found handling", () => {
    it("should handle conversation not found error gracefully", () => {
      expect(chatPageContent).toContain("not found");
      expect(chatPageContent).toContain("resetting");
    });

    it("getMessages query has retry logic for NOT_FOUND", () => {
      expect(chatPageContent).toContain("Conversation not found");
      expect(chatPageContent).toContain("NOT_FOUND");
    });
  });

  describe("Mermaid rendering integration", () => {
    it("should import MermaidConfig type from mermaid", () => {
      expect(chatPageContent).toContain('import type { MermaidConfig } from "mermaid"');
    });

    it("should define MERMAID_CONFIG constant with dark theme", () => {
      expect(chatPageContent).toContain("const MERMAID_CONFIG: MermaidConfig");
      expect(chatPageContent).toContain('theme: "dark"');
      expect(chatPageContent).toContain("darkMode: true");
    });

    it("should use debuga.ai brand colors in mermaid theme", () => {
      expect(chatPageContent).toContain('primaryBorderColor: "#22c55e"');
      expect(chatPageContent).toContain('lineColor: "#22c55e"');
      expect(chatPageContent).toContain('background: "#0a0a0a"');
    });

    it("should pass mermaidConfig to MessageWithMermaid for saved messages", () => {
      expect(chatPageContent).toContain("<MessageWithMermaid content={msg.content} mermaidConfig={MERMAID_CONFIG}");
    });

    it("should pass mermaidConfig to MessageWithMermaid for streaming content", () => {
      expect(chatPageContent).toContain("<MessageWithMermaid content={streamingContent} mermaidConfig={MERMAID_CONFIG}");
    });

    it("should use JetBrains Mono font for mermaid diagrams", () => {
      expect(chatPageContent).toContain('fontFamily: "JetBrains Mono, monospace"');
    });

    it("should configure flowchart settings for premium layout", () => {
      expect(chatPageContent).toContain("nodeSpacing: 50");
      expect(chatPageContent).toContain("rankSpacing: 60");
    });
  });

  describe("Mermaid CSS styling", () => {
    const cssContent = fs.readFileSync(
      "/home/ubuntu/debuga-ai/client/src/index.css",
      "utf-8"
    );

    it("should include @source for streamdown styles", () => {
      expect(cssContent).toContain('@source "../../node_modules/streamdown/dist/index.js"');
    });

    it("should have premium styling for mermaid blocks", () => {
      expect(cssContent).toContain('[data-streamdown="mermaid-block"]');
    });

    it("should have mobile responsive styles for mermaid", () => {
      expect(cssContent).toContain("@media (max-width: 640px)");
    });
  });
});
