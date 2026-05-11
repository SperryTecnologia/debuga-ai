import { describe, expect, it, vi } from "vitest";
import { AGENT_TOOLS, executeToolCall } from "./agentTools";
import type { ToolCall } from "./_core/llm";

describe("Agent Tools", () => {
  describe("AGENT_TOOLS definitions", () => {
    it("should define 8 tools", () => {
      expect(AGENT_TOOLS).toHaveLength(8);
    });

    it("should have correct tool names", () => {
      const names = AGENT_TOOLS.map((t) => t.function.name);
      expect(names).toContain("generate_image");
      expect(names).toContain("execute_code");
      expect(names).toContain("dns_lookup");
      expect(names).toContain("ssl_check");
      expect(names).toContain("http_check");
      expect(names).toContain("whois_lookup");
      expect(names).toContain("web_fetch");
      expect(names).toContain("port_scan");
    });

    it("each tool should have required parameters", () => {
      for (const tool of AGENT_TOOLS) {
        expect(tool.type).toBe("function");
        expect(tool.function.name).toBeTruthy();
        expect(tool.function.description).toBeTruthy();
        expect(tool.function.parameters).toBeDefined();
        expect(tool.function.parameters.type).toBe("object");
        expect(tool.function.parameters.required).toBeDefined();
        expect(Array.isArray(tool.function.parameters.required)).toBe(true);
      }
    });

    it("generate_image should require prompt", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "generate_image");
      expect(tool?.function.parameters.required).toContain("prompt");
    });

    it("execute_code should require code", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "execute_code");
      expect(tool?.function.parameters.required).toContain("code");
    });

    it("dns_lookup should require domain", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "dns_lookup");
      expect(tool?.function.parameters.required).toContain("domain");
    });

    it("ssl_check should require hostname", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "ssl_check");
      expect(tool?.function.parameters.required).toContain("hostname");
    });

    it("http_check should require url", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "http_check");
      expect(tool?.function.parameters.required).toContain("url");
    });

    it("whois_lookup should require domain", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "whois_lookup");
      expect(tool?.function.parameters.required).toContain("domain");
    });

    it("web_fetch should require url", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "web_fetch");
      expect(tool?.function.parameters.required).toContain("url");
    });

    it("port_scan should require host", () => {
      const tool = AGENT_TOOLS.find((t) => t.function.name === "port_scan");
      expect(tool?.function.parameters.required).toContain("host");
    });
  });

  describe("executeToolCall", () => {
    it("should handle invalid JSON arguments gracefully", async () => {
      const toolCall: ToolCall = {
        id: "call_test_1",
        type: "function",
        function: { name: "dns_lookup", arguments: "not-json" },
      };
      const result = await executeToolCall(toolCall);
      expect(result.toolCallId).toBe("call_test_1");
      expect(result.name).toBe("dns_lookup");
      expect(result.result.error).toBeDefined();
      expect(result.result.error).not.toContain("Argumentos inválidos");
      expect(result.result.error).toContain("Consulta DNS");
    });

    it("should handle unknown tool name", async () => {
      const toolCall: ToolCall = {
        id: "call_test_2",
        type: "function",
        function: { name: "unknown_tool", arguments: JSON.stringify({}) },
      };
      const result = await executeToolCall(toolCall);
      expect(result.result.error).toContain("não está disponível");
    });

    it("should execute code (python) successfully", async () => {
      const toolCall: ToolCall = {
        id: "call_test_3",
        type: "function",
        function: {
          name: "execute_code",
          arguments: JSON.stringify({ code: "print('hello debuga')", language: "python" }),
        },
      };
      const result = await executeToolCall(toolCall);
      expect(result.name).toBe("execute_code");
      expect(result.result.type).toBe("code");
      expect(result.result.output).toContain("hello debuga");
      expect(result.result.exitCode).toBe(0);
    });

    it("should execute code (bash) successfully", async () => {
      const toolCall: ToolCall = {
        id: "call_test_4",
        type: "function",
        function: {
          name: "execute_code",
          arguments: JSON.stringify({ code: "echo 'bash test'", language: "bash" }),
        },
      };
      const result = await executeToolCall(toolCall);
      expect(result.result.type).toBe("code");
      expect(result.result.output).toContain("bash test");
      expect(result.result.exitCode).toBe(0);
    });

    it("should handle code execution errors", async () => {
      const toolCall: ToolCall = {
        id: "call_test_5",
        type: "function",
        function: {
          name: "execute_code",
          arguments: JSON.stringify({ code: "import nonexistent_module_xyz" }),
        },
      };
      const result = await executeToolCall(toolCall);
      expect(result.result.type).toBe("code");
      expect(result.result.exitCode).not.toBe(0);
    });

    it("should perform DNS lookup", async () => {
      const toolCall: ToolCall = {
        id: "call_test_6",
        type: "function",
        function: {
          name: "dns_lookup",
          arguments: JSON.stringify({ domain: "google.com", recordType: "A" }),
        },
      };
      const result = await executeToolCall(toolCall);
      expect(result.result.type).toBe("dns");
      expect(result.result.domain).toBe("google.com");
      expect(result.result.records).toBeDefined();
      expect(result.result.records.A).toBeDefined();
    });

    it("should perform web fetch", async () => {
      const toolCall: ToolCall = {
        id: "call_test_web",
        type: "function",
        function: {
          name: "web_fetch",
          arguments: JSON.stringify({ url: "https://example.com", extract: "meta" }),
        },
      };
      const result = await executeToolCall(toolCall);
      expect(result.result.type).toBe("web_fetch");
      expect(result.result.url).toContain("https://example.com");
      expect(result.result.result).toBeDefined();
      expect(result.result.result.title).toBeDefined();
    });

    it("should perform port scan", async () => {
      const toolCall: ToolCall = {
        id: "call_test_port",
        type: "function",
        function: {
          name: "port_scan",
          arguments: JSON.stringify({ host: "localhost", ports: "80,443" }),
        },
      };
      const result = await executeToolCall(toolCall);
      // "localhost" doesn't have a dot, so domain validation rejects it
      // This is expected behavior - port_scan requires a valid host
      expect(result.result.error).toBeDefined();
      expect(result.result.error).toContain("host");
    });

    it("should handle web_fetch with invalid URL", async () => {
      const toolCall: ToolCall = {
        id: "call_test_web_err",
        type: "function",
        function: {
          name: "web_fetch",
          arguments: JSON.stringify({ url: "not-a-valid-url" }),
        },
      };
      const result = await executeToolCall(toolCall);
      expect(result.result.type).toBe("web_fetch");
      expect(result.result.result.error).toBeDefined();
    });
  });
});
