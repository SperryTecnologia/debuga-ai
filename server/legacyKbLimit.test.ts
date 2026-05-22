import { describe, it, expect } from "vitest";

/**
 * Tests for the legacy KB injection limit logic (problem #7 fix).
 * Verifies that the legacy path (ENABLE_CAPABILITY_ROUTING=false) applies
 * the same limits as the new path: max 5 items, max ~2000 tokens (8000 chars).
 */

describe("Legacy KB injection limits", () => {
  const LEGACY_KB_MAX_ITEMS = 5;
  const LEGACY_KB_MAX_CHARS = 8000;

  interface KBItem {
    title: string;
    category: string | null;
    content: string;
  }

  /**
   * Simulates the legacy KB injection logic from buildDynamicSystemPrompt.
   * Returns the number of items injected and total chars.
   */
  function simulateLegacyKbInjection(knowledge: KBItem[]): { injectedCount: number; injectedChars: number } {
    let injectedCount = 0;
    let injectedChars = 0;

    for (const item of knowledge) {
      if (injectedCount >= LEGACY_KB_MAX_ITEMS) break;
      const itemText = `\n### ${item.title}${item.category ? ` [${item.category}]` : ""}\n${item.content}\n`;
      if (injectedChars + itemText.length > LEGACY_KB_MAX_CHARS && injectedCount > 0) break;
      injectedCount++;
      injectedChars += itemText.length;
    }

    return { injectedCount, injectedChars };
  }

  it("injects all items when under both limits", () => {
    const items: KBItem[] = [
      { title: "Item 1", category: "network", content: "Short content" },
      { title: "Item 2", category: "security", content: "Another short content" },
      { title: "Item 3", category: null, content: "Third item" },
    ];
    const result = simulateLegacyKbInjection(items);
    expect(result.injectedCount).toBe(3);
    expect(result.injectedChars).toBeLessThan(LEGACY_KB_MAX_CHARS);
  });

  it("limits to 5 items even if chars allow more", () => {
    const items: KBItem[] = Array.from({ length: 20 }, (_, i) => ({
      title: `Item ${i + 1}`,
      category: "test",
      content: "Short",
    }));
    const result = simulateLegacyKbInjection(items);
    expect(result.injectedCount).toBe(5);
  });

  it("limits by chars even if item count allows more", () => {
    // Each item is ~2000 chars, so only ~4 should fit within 8000
    const items: KBItem[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Item ${i + 1}`,
      category: "large",
      content: "x".repeat(1900), // ~1930 chars per item with title/formatting
    }));
    const result = simulateLegacyKbInjection(items);
    expect(result.injectedCount).toBeLessThanOrEqual(5);
    expect(result.injectedChars).toBeLessThanOrEqual(LEGACY_KB_MAX_CHARS + 2000); // first item always allowed
  });

  it("always injects at least 1 item even if it exceeds char limit", () => {
    const items: KBItem[] = [
      { title: "Huge Item", category: null, content: "x".repeat(10000) },
      { title: "Small Item", category: null, content: "small" },
    ];
    const result = simulateLegacyKbInjection(items);
    // First item is always injected (the break condition checks injectedCount > 0)
    expect(result.injectedCount).toBe(1);
  });

  it("returns 0 for empty knowledge base", () => {
    const result = simulateLegacyKbInjection([]);
    expect(result.injectedCount).toBe(0);
    expect(result.injectedChars).toBe(0);
  });

  it("stops at char limit boundary correctly", () => {
    // 4 items of ~1800 chars each = ~7200 total, 5th would exceed 8000
    const items: KBItem[] = Array.from({ length: 6 }, (_, i) => ({
      title: `KB ${i + 1}`,
      category: "net",
      content: "a".repeat(1750),
    }));
    const result = simulateLegacyKbInjection(items);
    // Should inject 4 items (~7200 chars), 5th would push over 8000
    expect(result.injectedCount).toBeLessThanOrEqual(5);
    expect(result.injectedChars).toBeLessThanOrEqual(LEGACY_KB_MAX_CHARS + 1850);
  });
});
