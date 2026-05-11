import { describe, it, expect, vi } from "vitest";

// Mock external dependencies
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/image.png" }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/stored.png", key: "test" }),
}));

import { executeToolCall } from "./agentTools";

// ── Internal Error Flagging ──
describe("executeToolCall - internal error handling", () => {
  it("should mark JSON parse failures as _internalError and _retryable", async () => {
    const result = await executeToolCall({
      id: "call_err_1",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: "not json at all %%%",
      },
    });
    expect(result.result.error).toBeDefined();
    expect(result.result._internalError).toBe(true);
    expect(result.result._retryable).toBe(true);
    // Should NOT contain raw technical terms visible to user
    expect(result.result.error).not.toContain("JSON");
    expect(result.result.error).not.toContain("parse");
  });

  it("should mark validation failures as _internalError and _retryable", async () => {
    const result = await executeToolCall({
      id: "call_err_2",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"recordType":"A"}', // missing required 'domain'
      },
    });
    expect(result.result.error).toBeDefined();
    expect(result.result._internalError).toBe(true);
    expect(result.result._retryable).toBe(true);
  });

  it("should NOT mark execution errors (timeout, network) as _internalError", async () => {
    // This test uses a domain that will likely timeout or fail with network error
    const result = await executeToolCall({
      id: "call_err_3",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"this-domain-does-not-exist-xyz123.invalid"}',
      },
    });
    // DNS lookup for non-existent domain should either succeed with empty results
    // or fail with a user-facing error (NOT internal)
    if (result.result.error) {
      expect(result.result._internalError).toBeFalsy();
    }
  });

  it("should NOT mark unknown tool errors as _internalError", async () => {
    const result = await executeToolCall({
      id: "call_err_4",
      type: "function",
      function: {
        name: "nonexistent_tool",
        arguments: "{}",
      },
    });
    expect(result.result.error).toBeDefined();
    expect(result.result.error).toContain("não está disponível");
    // Unknown tool is NOT an internal error - it's a user-facing message
    expect(result.result._internalError).toBeUndefined();
  });

  it("should include _internal field for logging but not expose to user", async () => {
    const result = await executeToolCall({
      id: "call_err_5",
      type: "function",
      function: {
        name: "ssl_check",
        arguments: "completely broken {{{",
      },
    });
    expect(result.result._internal).toBeDefined();
    expect(result.result._internal).toBe("JSON parse failed");
  });

  it("should have friendly error message in PT-BR for parse failures", async () => {
    const result = await executeToolCall({
      id: "call_err_6",
      type: "function",
      function: {
        name: "http_check",
        arguments: "broken json",
      },
    });
    expect(result.result.error).toContain("Parâmetros inválidos");
    expect(result.result.error).toContain("tentará novamente");
  });

  it("should have friendly error message in PT-BR for validation failures", async () => {
    const result = await executeToolCall({
      id: "call_err_7",
      type: "function",
      function: {
        name: "http_check",
        arguments: '{}', // missing required 'url'
      },
    });
    expect(result.result.error).toContain("url");
    expect(result.result.error).toContain("precisa");
  });
});

// ── Successful execution should NOT have error flags ──
describe("executeToolCall - successful execution has no error flags", () => {
  it("dns_lookup success should not have _internalError", async () => {
    const result = await executeToolCall({
      id: "call_ok_1",
      type: "function",
      function: {
        name: "dns_lookup",
        arguments: '{"domain":"google.com","recordType":"A"}',
      },
    });
    expect(result.result._internalError).toBeUndefined();
    expect(result.result._retryable).toBeUndefined();
    expect(result.result.error).toBeUndefined();
    expect(result.result.type).toBe("dns");
  });
});
