import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/image.png" }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/stored.png", key: "test" }),
}));

import { executeToolCall, AGENT_TOOLS } from "./agentTools";

// ── JSON Parsing & Repair ──
describe("executeToolCall - JSON parsing", () => {
  it("should parse valid JSON arguments", async () => {
    const result = await executeToolCall({
      id: "call_1",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"github.com","recordType":"A"}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.type).toBe("dns");
    expect(result.result.domain).toBe("github.com");
  });

  it("should repair JSON with trailing commas", async () => {
    const result = await executeToolCall({
      id: "call_2",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"github.com","recordType":"A",}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.type).toBe("dns");
  });

  it("should return friendly error for completely invalid JSON", async () => {
    const result = await executeToolCall({
      id: "call_3",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: "not json at all %%%",
      },
    });
    expect(result.result.error).toBeDefined();
    expect(result.result.error).toContain("Consulta DNS");
    expect(result.result.error).toContain("reformular");
    // Should NOT contain "Argumentos inválidos"
    expect(result.result.error).not.toContain("Argumentos inválidos");
  });

  it("should return friendly error for empty arguments string", async () => {
    const result = await executeToolCall({
      id: "call_4",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: "",
      },
    });
    expect(result.result.error).toBeDefined();
    expect(result.result.error).not.toContain("Argumentos inválidos");
  });
});

// ── Required Argument Validation ──
describe("executeToolCall - argument validation", () => {
  it("should reject dns_lookup without domain", async () => {
    const result = await executeToolCall({
      id: "call_5",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"recordType":"A"}',
      },
    });
    expect(result.result.error).toContain("domain");
    expect(result.result.error).not.toContain("Argumentos inválidos");
  });

  it("should reject ssl_check without hostname", async () => {
    const result = await executeToolCall({
      id: "call_6",
      type: "function",
      function: {
        name: "ssl_check",
        arguments: '{"port":443}',
      },
    });
    expect(result.result.error).toContain("hostname");
  });

  it("should reject http_check without url", async () => {
    const result = await executeToolCall({
      id: "call_7",
      type: "function",
      function: {
        name: "http_check",
        arguments: "{}",
      },
    });
    expect(result.result.error).toContain("url");
  });

  it("should reject web_fetch without url", async () => {
    const result = await executeToolCall({
      id: "call_8",
      type: "function",
      function: {
        name: "web_fetch",
        arguments: '{"extract":"text"}',
      },
    });
    expect(result.result.error).toContain("url");
  });

  it("should reject port_scan without host", async () => {
    const result = await executeToolCall({
      id: "call_9",
      type: "function",
      function: {
        name: "port_scan",
        arguments: '{"ports":"80,443"}',
      },
    });
    expect(result.result.error).toContain("host");
  });

  it("should reject execute_code without code", async () => {
    const result = await executeToolCall({
      id: "call_10",
      type: "function",
      function: {
        name: "execute_code",
        arguments: '{"language":"python"}',
      },
    });
    expect(result.result.error).toContain("code");
  });

  it("should reject generate_image without prompt", async () => {
    const result = await executeToolCall({
      id: "call_11",
      type: "function",
      function: {
        name: "generate_image",
        arguments: "{}",
      },
    });
    expect(result.result.error).toContain("prompt");
  });

  it("should reject whois_lookup without domain", async () => {
    const result = await executeToolCall({
      id: "call_12",
      type: "function",
      function: {
        name: "whois_lookup",
        arguments: "{}",
      },
    });
    expect(result.result.error).toContain("domain");
  });
});

// ── Domain Validation ──
describe("executeToolCall - domain validation", () => {
  it("should strip protocol from domain", async () => {
    const result = await executeToolCall({
      id: "call_13",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"https://github.com/path"}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.domain).toBe("github.com");
  });

  it("should reject invalid domain (no dot)", async () => {
    const result = await executeToolCall({
      id: "call_14",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"localhost"}',
      },
    });
    expect(result.result.error).toBeDefined();
    expect(result.result.error).toContain("domínio");
  });

  it("should reject empty domain", async () => {
    const result = await executeToolCall({
      id: "call_15",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":""}',
      },
    });
    expect(result.result.error).toBeDefined();
  });
});

// ── URL Validation ──
describe("executeToolCall - URL validation", () => {
  it("should accept valid URL with protocol", async () => {
    const result = await executeToolCall({
      id: "call_16",
      type: "function",
      function: {
        name: "http_check",
        arguments: '{"url":"https://example.com"}',
      },
    });
    // Should not have a validation error (may have network error in test env)
    if (result.result.error) {
      // Network errors are OK in test, but validation errors are not
      expect(result.result.error).not.toContain("URL");
      expect(result.result.error).not.toContain("válida");
    }
  });

  it("should auto-add https:// to URL without protocol", async () => {
    const result = await executeToolCall({
      id: "call_17",
      type: "function",
      function: {
        name: "web_fetch",
        arguments: '{"url":"example.com"}',
      },
    });
    // Should not fail on URL validation
    if (result.result.error) {
      expect(result.result.error).not.toContain("URL");
    }
  });
});

// ── DNS Record Type Validation ──
describe("executeToolCall - DNS record type", () => {
  it("should default to ALL when no recordType specified", async () => {
    const result = await executeToolCall({
      id: "call_18",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"github.com"}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.type).toBe("dns");
    // Should have multiple record types since ALL was used
    expect(Object.keys(result.result.records).length).toBeGreaterThan(1);
  });

  it("should normalize recordType to uppercase", async () => {
    const result = await executeToolCall({
      id: "call_19",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"github.com","recordType":"mx"}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.type).toBe("dns");
  });

  it("should default invalid recordType to ALL", async () => {
    const result = await executeToolCall({
      id: "call_20",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"github.com","recordType":"INVALID"}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.type).toBe("dns");
  });
});

// ── Unknown Tool ──
describe("executeToolCall - unknown tool", () => {
  it("should return friendly error for unknown tool", async () => {
    const result = await executeToolCall({
      id: "call_21",
      type: "function",
      function: {
        name: "nonexistent_tool",
        arguments: "{}",
      },
    });
    expect(result.result.error).toBeDefined();
    expect(result.result.error).toContain("não está disponível");
    expect(result.result.error).not.toContain("Argumentos inválidos");
  });
});

// ── Tool Definitions Integrity ──
describe("AGENT_TOOLS - definitions", () => {
  it("should have 8 tools defined", () => {
    expect(AGENT_TOOLS.length).toBe(8);
  });

  it("should have required parameters for each tool", () => {
    const expectedTools = [
      "generate_image", "execute_code", "dns_lookup", "ssl_check",
      "http_check", "whois_lookup", "web_fetch", "port_scan",
    ];
    const toolNames = AGENT_TOOLS.map(t => t.function.name);
    for (const name of expectedTools) {
      expect(toolNames).toContain(name);
    }
  });

  it("each tool should have a description", () => {
    for (const tool of AGENT_TOOLS) {
      expect(tool.function.description).toBeTruthy();
      expect(tool.function.description.length).toBeGreaterThan(10);
    }
  });

  it("each tool should have parameters with required fields", () => {
    for (const tool of AGENT_TOOLS) {
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters.type).toBe("object");
      expect(tool.function.parameters.required).toBeDefined();
      expect(Array.isArray(tool.function.parameters.required)).toBe(true);
      expect(tool.function.parameters.required.length).toBeGreaterThan(0);
    }
  });
});

// ── Friendly Error Messages (no "Argumentos inválidos") ──
describe("executeToolCall - no raw error messages", () => {
  const badInputs = [
    { name: "dns_lookup", args: "" },
    { name: "dns_lookup", args: "null" },
    { name: "dns_lookup", args: "{}" },
    { name: "ssl_check", args: "{}" },
    { name: "http_check", args: "{}" },
    { name: "web_fetch", args: "{}" },
    { name: "port_scan", args: "{}" },
    { name: "execute_code", args: "{}" },
    { name: "generate_image", args: "{}" },
    { name: "whois_lookup", args: "{}" },
    { name: "dns_lookup", args: "broken json {{{" },
    { name: "unknown_tool", args: "{}" },
  ];

  for (const { name, args } of badInputs) {
    it(`should never show "Argumentos inválidos" for ${name} with args="${args}"`, async () => {
      const result = await executeToolCall({
        id: `call_bad_${name}`,
        type: "function",
        function: { name, arguments: args },
      });
      if (result.result.error) {
        expect(result.result.error).not.toContain("Argumentos inválidos");
        expect(result.result.error).not.toContain("stack");
        expect(result.result.error).not.toContain("Error:");
        // Should be in Portuguese
        expect(result.result.error.length).toBeGreaterThan(10);
      }
    });
  }
});

// ── Code Execution Safety ──
describe("executeToolCall - code execution", () => {
  it("should execute safe Python code", async () => {
    const result = await executeToolCall({
      id: "call_code_1",
      type: "function",
      function: {
        name: "execute_code",
        arguments: '{"code":"import ipaddress; print(ipaddress.ip_address(\'192.168.0.1\'))","language":"python"}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.type).toBe("code");
    expect(result.result.output).toContain("192.168.0.1");
  });

  it("should default language to python", async () => {
    const result = await executeToolCall({
      id: "call_code_2",
      type: "function",
      function: {
        name: "execute_code",
        arguments: '{"code":"print(1+1)"}',
      },
    });
    expect(result.result.error).toBeUndefined();
    expect(result.result.language).toBe("python");
  });
});

// ── Suggested Prompts Validation ──
describe("Suggested prompts", () => {
  // These prompts are defined in the frontend but we validate their structure here
  const SUGGESTED_PROMPTS = [
    {
      title: "Navegar em Site",
      prompt: "Acesse https://example.com, leia o conteúdo principal e resuma o que o site apresenta.",
      requiredPlan: "starter",
      toolsUsed: ["web_fetch"],
    },
    {
      title: "Auditoria de Segurança",
      prompt: "Faça uma auditoria passiva e segura de https://example.com verificando HTTPS, certificado SSL, headers de segurança e DNS público. Não execute scan invasivo.",
      requiredPlan: "starter",
      toolsUsed: ["ssl_check", "http_check", "dns_lookup"],
    },
    {
      title: "Sandbox de Código",
      prompt: "Execute um script Python seguro que valida se '192.168.0.1' é um endereço IPv4 válido usando a biblioteca padrão ipaddress e mostre informações sobre a rede.",
      requiredPlan: "pro",
      toolsUsed: ["execute_code"],
    },
    {
      title: "Scan de Portas",
      prompt: "Verifique de forma segura apenas as portas 80 e 443 de example.com e explique o resultado.",
      requiredPlan: "pro",
      toolsUsed: ["port_scan"],
    },
    {
      title: "Diagnóstico DNS",
      prompt: "Faça um diagnóstico DNS do domínio github.com consultando registros A, MX, TXT e NS. Execute cada consulta separadamente se necessário e apresente um resumo objetivo.",
      requiredPlan: "starter",
      toolsUsed: ["dns_lookup"],
    },
    {
      title: "Gerar Diagrama",
      prompt: "Gere um diagrama simples de arquitetura com usuário, firewall, servidor web, banco de dados e serviço de monitoramento.",
      requiredPlan: "pro",
      toolsUsed: ["generate_image"],
    },
  ];

  it("should have 6 suggested prompts", () => {
    expect(SUGGESTED_PROMPTS.length).toBe(6);
  });

  it("each prompt should be non-empty and descriptive", () => {
    for (const p of SUGGESTED_PROMPTS) {
      expect(p.prompt.length).toBeGreaterThan(20);
      expect(p.title.length).toBeGreaterThan(3);
    }
  });

  it("each prompt should reference valid tools", () => {
    const validTools = AGENT_TOOLS.map(t => t.function.name);
    for (const p of SUGGESTED_PROMPTS) {
      for (const tool of p.toolsUsed) {
        expect(validTools).toContain(tool);
      }
    }
  });

  it("prompts using Starter tools should require starter plan", () => {
    const starterTools = ["dns_lookup", "ssl_check", "http_check", "whois_lookup", "web_fetch"];
    for (const p of SUGGESTED_PROMPTS) {
      const usesOnlyStarter = p.toolsUsed.every(t => starterTools.includes(t));
      if (usesOnlyStarter) {
        expect(["starter", "free"]).toContain(p.requiredPlan);
      }
    }
  });

  it("prompts using Pro tools should require pro plan", () => {
    const proOnlyTools = ["port_scan", "execute_code", "generate_image"];
    for (const p of SUGGESTED_PROMPTS) {
      const usesProTool = p.toolsUsed.some(t => proOnlyTools.includes(t));
      if (usesProTool) {
        expect(p.requiredPlan).toBe("pro");
      }
    }
  });

  it("DNS prompt should include specific domain and record types", () => {
    const dnsPrompt = SUGGESTED_PROMPTS.find(p => p.title === "Diagnóstico DNS");
    expect(dnsPrompt).toBeDefined();
    expect(dnsPrompt!.prompt).toContain("github.com");
    expect(dnsPrompt!.prompt).toMatch(/A|MX|TXT|NS/);
  });

  it("Navegar em Site should use a stable URL", () => {
    const navPrompt = SUGGESTED_PROMPTS.find(p => p.title === "Navegar em Site");
    expect(navPrompt).toBeDefined();
    expect(navPrompt!.prompt).toContain("https://");
    // Should NOT use gov.br/anatel (unstable)
    expect(navPrompt!.prompt).not.toContain("gov.br");
  });

  it("Auditoria should be passive (no port scan)", () => {
    const auditPrompt = SUGGESTED_PROMPTS.find(p => p.title === "Auditoria de Segurança");
    expect(auditPrompt).toBeDefined();
    expect(auditPrompt!.toolsUsed).not.toContain("port_scan");
    expect(auditPrompt!.prompt.toLowerCase()).toContain("passiva");
  });

  it("Sandbox de Código should use safe code", () => {
    const codePrompt = SUGGESTED_PROMPTS.find(p => p.title === "Sandbox de Código");
    expect(codePrompt).toBeDefined();
    // Should not mention port scan in code
    expect(codePrompt!.prompt.toLowerCase()).not.toContain("port scan");
    expect(codePrompt!.prompt).toContain("ipaddress");
  });

  it("Scan de Portas should only scan safe ports", () => {
    const scanPrompt = SUGGESTED_PROMPTS.find(p => p.title === "Scan de Portas");
    expect(scanPrompt).toBeDefined();
    expect(scanPrompt!.prompt).toMatch(/80|443/);
  });
});
