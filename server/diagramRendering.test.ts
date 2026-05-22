import { describe, it, expect } from "vitest";

/**
 * Tests for diagram rendering robustness:
 * 1. Server-side: maxTokens logic for admin and diagram tasks
 * 2. Client-side: JSON repair for truncated content
 * 3. Client-side: splitContent with streaming protection
 */

// ── Server-side maxTokens logic ──
describe("maxTokens calculation", () => {
  const FREE_PLAN_LIMIT = 2048;
  const STARTER_PLAN_LIMIT = 4096;
  const PRO_PLAN_LIMIT = 32768;

  function calculateMaxTokens(
    isAdmin: boolean,
    isDiagramTask: boolean,
    planLimit: number
  ): number {
    return isAdmin
      ? 65536
      : isDiagramTask
      ? Math.max(planLimit, 8192)
      : planLimit;
  }

  it("admin always gets 65536 tokens regardless of plan", () => {
    expect(calculateMaxTokens(true, false, FREE_PLAN_LIMIT)).toBe(65536);
    expect(calculateMaxTokens(true, true, FREE_PLAN_LIMIT)).toBe(65536);
  });

  it("diagram tasks get minimum 8192 tokens even on free plan", () => {
    expect(calculateMaxTokens(false, true, FREE_PLAN_LIMIT)).toBe(8192);
    expect(calculateMaxTokens(false, true, STARTER_PLAN_LIMIT)).toBe(8192);
  });

  it("diagram tasks on pro plan keep their higher limit", () => {
    expect(calculateMaxTokens(false, true, PRO_PLAN_LIMIT)).toBe(32768);
  });

  it("non-diagram tasks use plan limit as-is", () => {
    expect(calculateMaxTokens(false, false, FREE_PLAN_LIMIT)).toBe(2048);
    expect(calculateMaxTokens(false, false, STARTER_PLAN_LIMIT)).toBe(4096);
    expect(calculateMaxTokens(false, false, PRO_PLAN_LIMIT)).toBe(32768);
  });
});

// ── JSON repair for truncated content ──
describe("repairTruncatedJson", () => {
  function repairTruncatedJson(text: string): any | null {
    let cleaned = text.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, "");
    cleaned = cleaned.replace(/,\s*$/, "");

    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") braces++;
      if (ch === "}") braces--;
      if (ch === "[") brackets++;
      if (ch === "]") brackets--;
    }

    let repaired = cleaned;
    while (brackets > 0) { repaired += "]"; brackets--; }
    while (braces > 0) { repaired += "}"; braces--; }

    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }

  it("repairs JSON truncated after a complete node", () => {
    const truncated = `{
  "type": "network",
  "title": "Test Diagram",
  "zones": [{"id": "lan", "label": "LAN"}],
  "nodes": [{"id": "srv1", "label": "Server", "type": "server", "zone": "lan"}],
  "edges": [{"from": "srv1", "to": "srv1", "label": "loop"}`;
    const result = repairTruncatedJson(truncated);
    expect(result).not.toBeNull();
    expect(result.title).toBe("Test Diagram");
    expect(result.nodes).toHaveLength(1);
  });

  it("repairs JSON truncated mid-field", () => {
    const truncated = `{
  "type": "network",
  "title": "Test",
  "zones": [{"id": "wan", "label": "WAN"}],
  "nodes": [{"id": "fw", "label": "Firewall", "type": "firewall", "zone": "wan"}],
  "edges": [{"from": "fw", "to": "fw", "label": "test"}],
  "summary": "This is a truncated summ`;
    const result = repairTruncatedJson(truncated);
    expect(result).not.toBeNull();
    expect(result.title).toBe("Test");
  });

  it("returns null for completely invalid content", () => {
    expect(repairTruncatedJson("not json at all")).toBeNull();
    expect(repairTruncatedJson("")).toBeNull();
  });

  it("handles already valid JSON", () => {
    const valid = `{"type": "network", "title": "OK", "zones": [], "nodes": [], "edges": []}`;
    const result = repairTruncatedJson(valid);
    expect(result).not.toBeNull();
    expect(result.title).toBe("OK");
  });
});

// ── Diagram markers detection ──
describe("hasDiagramMarkers", () => {
  function hasDiagramMarkers(content: string): boolean {
    return (
      content.includes('"nodes"') ||
      content.includes('"zones"') ||
      content.includes("diagram-spec") ||
      content.includes('"edges"')
    );
  }

  it("detects diagram-spec keyword", () => {
    expect(hasDiagramMarkers("```diagram-spec\n{")).toBe(true);
  });

  it("detects nodes field", () => {
    expect(hasDiagramMarkers('{"nodes": []}' )).toBe(true);
  });

  it("does not trigger on normal text", () => {
    expect(hasDiagramMarkers("Hello, how are you?")).toBe(false);
  });
});

// ── isDiagramJsonComplete ──
describe("isDiagramJsonComplete", () => {
  function isDiagramJsonComplete(content: string): boolean {
    const hasCompleteFence = /```(?:diagram-spec|json)\s*\n[\s\S]*?```/.test(content);
    if (hasCompleteFence) return true;

    const nodesIdx = content.indexOf('"nodes"');
    if (nodesIdx === -1) return false;

    const firstBrace = content.lastIndexOf("{", nodesIdx);
    if (firstBrace === -1) return false;

    let depth = 0;
    for (let i = firstBrace; i < content.length; i++) {
      if (content[i] === "{") depth++;
      if (content[i] === "}") {
        depth--;
        if (depth === 0) return true;
      }
    }

    return false;
  }

  it("detects complete fenced diagram-spec", () => {
    const complete = '```diagram-spec\n{"nodes": [], "edges": []}\n```';
    expect(isDiagramJsonComplete(complete)).toBe(true);
  });

  it("detects incomplete fenced diagram-spec (no closing ```)", () => {
    const incomplete = '```diagram-spec\n{"nodes": [], "edges": []';
    expect(isDiagramJsonComplete(incomplete)).toBe(false);
  });

  it("detects complete unfenced JSON", () => {
    const complete = '{"title": "Test", "nodes": [{"id": "a"}], "edges": []}';
    expect(isDiagramJsonComplete(complete)).toBe(true);
  });

  it("detects incomplete unfenced JSON", () => {
    const incomplete = '{"title": "Test", "nodes": [{"id": "a"}], "edges": [{"from": "a"';
    expect(isDiagramJsonComplete(incomplete)).toBe(false);
  });
});
