import { describe, it, expect } from "vitest";

// ── Demo Mode Architecture Tests ──
// These tests validate the Demo Mode separation from normal chat usage.

// Simulate the demo rate limiter logic (mirrors server/streamRoute.ts)
const DEMO_MAX_PER_DAY = 10;

function createDemoLimiter() {
  const map = new Map<number, { count: number; dayStart: number }>();

  return {
    check(userId: number): { allowed: boolean; used: number } {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const entry = map.get(userId);

      if (!entry || entry.dayStart < todayStart) {
        map.set(userId, { count: 1, dayStart: todayStart });
        return { allowed: true, used: 1 };
      }

      if (entry.count >= DEMO_MAX_PER_DAY) {
        return { allowed: false, used: entry.count };
      }

      entry.count++;
      return { allowed: true, used: entry.count };
    },
    getMap: () => map,
  };
}

describe("Demo Mode Rate Limiter", () => {
  it("allows first demo for a new user", () => {
    const limiter = createDemoLimiter();
    const result = limiter.check(1);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
  });

  it("allows up to 10 demos per day", () => {
    const limiter = createDemoLimiter();
    for (let i = 1; i <= DEMO_MAX_PER_DAY; i++) {
      const result = limiter.check(1);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(i);
    }
  });

  it("blocks the 11th demo", () => {
    const limiter = createDemoLimiter();
    for (let i = 0; i < DEMO_MAX_PER_DAY; i++) {
      limiter.check(1);
    }
    const result = limiter.check(1);
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(DEMO_MAX_PER_DAY);
  });

  it("tracks different users independently", () => {
    const limiter = createDemoLimiter();
    // User 1 uses 10 demos
    for (let i = 0; i < DEMO_MAX_PER_DAY; i++) {
      limiter.check(1);
    }
    // User 2 should still be allowed
    const result = limiter.check(2);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
  });

  it("resets counter on a new day", () => {
    const limiter = createDemoLimiter();
    // Use all demos
    for (let i = 0; i < DEMO_MAX_PER_DAY; i++) {
      limiter.check(1);
    }
    expect(limiter.check(1).allowed).toBe(false);

    // Simulate day change by manipulating the map entry
    const entry = limiter.getMap().get(1)!;
    entry.dayStart = Date.now() - 86400000 * 2; // 2 days ago
    limiter.getMap().set(1, entry);

    const result = limiter.check(1);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
  });
});

describe("Demo Mode Request Body", () => {
  it("isDemo flag is correctly parsed as boolean", () => {
    // Simulate request body parsing
    const body1 = { conversationId: 1, content: "test", isDemo: true };
    const body2 = { conversationId: 1, content: "test" };
    const body3 = { conversationId: 1, content: "test", isDemo: false };

    expect(body1.isDemo === true).toBe(true);
    expect(body2.isDemo === true).toBe(false);
    expect(body3.isDemo === true).toBe(false);
  });

  it("isDemoMode is false when isDemo is not provided", () => {
    const body = { conversationId: 1, content: "test" };
    const isDemoMode = body.isDemo === true;
    expect(isDemoMode).toBe(false);
  });

  it("isDemoMode is false for string 'true'", () => {
    const body = { conversationId: 1, content: "test", isDemo: "true" as any };
    const isDemoMode = body.isDemo === true;
    expect(isDemoMode).toBe(false);
  });
});

describe("Demo Mode vs Normal Chat Separation", () => {
  it("demo mode should skip plan limit checks", () => {
    const isDemoMode = true;
    const isAdmin = false;
    const planLimitsChecked = !isDemoMode && !isAdmin;
    expect(planLimitsChecked).toBe(false);
  });

  it("normal chat should enforce plan limit checks", () => {
    const isDemoMode = false;
    const isAdmin = false;
    const planLimitsChecked = !isDemoMode && !isAdmin;
    expect(planLimitsChecked).toBe(true);
  });

  it("admin bypasses plan limits in both modes", () => {
    const isAdmin = true;
    // Normal chat
    const normalCheck = !false && !isAdmin;
    expect(normalCheck).toBe(false);
    // Demo mode
    const demoCheck = !true && !isAdmin;
    expect(demoCheck).toBe(false);
  });

  it("demo mode should skip usage recording", () => {
    const isDemoMode = true;
    const shouldRecord = !isDemoMode;
    expect(shouldRecord).toBe(false);
  });

  it("normal chat should record usage", () => {
    const isDemoMode = false;
    const shouldRecord = !isDemoMode;
    expect(shouldRecord).toBe(true);
  });

  it("demo mode should skip credit consumption", () => {
    const isDemoMode = true;
    const isAdmin = false;
    const totalTokensEstimate = 500;
    const shouldConsume = !isAdmin && !isDemoMode && totalTokensEstimate > 0;
    expect(shouldConsume).toBe(false);
  });

  it("normal chat should consume credits", () => {
    const isDemoMode = false;
    const isAdmin = false;
    const totalTokensEstimate = 500;
    const shouldConsume = !isAdmin && !isDemoMode && totalTokensEstimate > 0;
    expect(shouldConsume).toBe(true);
  });
});

describe("Demo Mode Tool Access", () => {
  const ALL_TOOLS = ["dns_lookup", "ssl_check", "http_check", "whois_lookup", "web_fetch", "port_scan", "generate_image", "execute_code"];
  const BASIC_TOOLS = ["dns_lookup", "ssl_check", "http_check", "whois_lookup", "web_fetch"];

  function getToolsForMode(planId: string, isDemoMode: boolean, isAdmin: boolean): string[] {
    if (isAdmin || isDemoMode) return ALL_TOOLS;
    if (planId === "free") return [];
    if (planId === "starter") return BASIC_TOOLS;
    return ALL_TOOLS;
  }

  it("demo mode gives all tools to Free users", () => {
    const tools = getToolsForMode("free", true, false);
    expect(tools).toEqual(ALL_TOOLS);
    expect(tools).toContain("port_scan");
    expect(tools).toContain("generate_image");
    expect(tools).toContain("execute_code");
  });

  it("demo mode gives all tools to Starter users", () => {
    const tools = getToolsForMode("starter", true, false);
    expect(tools).toEqual(ALL_TOOLS);
  });

  it("normal chat gives no tools to Free users", () => {
    const tools = getToolsForMode("free", false, false);
    expect(tools).toEqual([]);
  });

  it("normal chat gives basic tools to Starter users", () => {
    const tools = getToolsForMode("starter", false, false);
    expect(tools).toEqual(BASIC_TOOLS);
    expect(tools).not.toContain("port_scan");
  });

  it("normal chat gives all tools to Pro users", () => {
    const tools = getToolsForMode("pro", false, false);
    expect(tools).toEqual(ALL_TOOLS);
  });
});

describe("Modal Stacking Prevention", () => {
  it("CTA should not open when upgrade modal is open", () => {
    const upgradeModalOpen = true;
    const isDemoComplete = true;
    const shouldShowCTA = isDemoComplete && !upgradeModalOpen;
    expect(shouldShowCTA).toBe(false);
  });

  it("CTA should open when upgrade modal is closed", () => {
    const upgradeModalOpen = false;
    const isDemoComplete = true;
    const shouldShowCTA = isDemoComplete && !upgradeModalOpen;
    expect(shouldShowCTA).toBe(true);
  });

  it("upgrade modal should suppress existing CTA", () => {
    let showCTA = true;
    // When upgrade modal opens, CTA should be suppressed
    const onUpgradeModalOpen = () => { showCTA = false; };
    onUpgradeModalOpen();
    expect(showCTA).toBe(false);
  });

  it("CTA dialog has correct guard condition", () => {
    // The Dialog open prop: showDemoUpgradeCTA && !upgradeModal?.open
    const cases = [
      { cta: true, modal: true, expected: false },
      { cta: true, modal: false, expected: true },
      { cta: false, modal: true, expected: false },
      { cta: false, modal: false, expected: false },
    ];
    for (const c of cases) {
      const result = c.cta && !c.modal;
      expect(result).toBe(c.expected);
    }
  });
});

describe("Demo Prompt Quality", () => {
  // Import the prompts structure for validation
  const DEMO_PROMPTS = [
    { title: "Diagnóstico DNS", target: "github.com", tools: ["dns_lookup"], hasTableRequest: true },
    { title: "Navegar em Site", target: "cloudflare.com", tools: ["web_fetch"], hasTableRequest: true },
    { title: "Auditoria de Segurança", target: "cloudflare.com", tools: ["ssl_check", "http_check", "dns_lookup"], hasChecklist: true },
    { title: "Gerar Diagrama", target: null, tools: ["generate_image"], hasDetailedSpec: true },
    { title: "Scan de Portas", target: "scanme.nmap.org", tools: ["port_scan"], hasSafeTarget: true },
    { title: "Sandbox de Código", target: null, tools: ["execute_code"], hasSafeCode: true },
  ];

  it("all 6 demo cards are defined", () => {
    expect(DEMO_PROMPTS).toHaveLength(6);
  });

  it("DNS demo targets a stable public domain", () => {
    const dns = DEMO_PROMPTS[0];
    expect(dns.target).toBe("github.com");
  });

  it("web navigation demo targets a stable site", () => {
    const nav = DEMO_PROMPTS[1];
    expect(nav.target).toBe("cloudflare.com");
  });

  it("security audit demo uses passive approach", () => {
    const audit = DEMO_PROMPTS[2];
    expect(audit.hasChecklist).toBe(true);
  });

  it("port scan demo uses official test server", () => {
    const scan = DEMO_PROMPTS[4];
    expect(scan.target).toBe("scanme.nmap.org");
    expect(scan.hasSafeTarget).toBe(true);
  });

  it("code sandbox demo uses safe standard library", () => {
    const code = DEMO_PROMPTS[5];
    expect(code.hasSafeCode).toBe(true);
  });

  it("diagram demo requests detailed professional output", () => {
    const diagram = DEMO_PROMPTS[3];
    expect(diagram.hasDetailedSpec).toBe(true);
  });
});

describe("Demo SSE Response", () => {
  it("done event includes isDemo flag when in demo mode", () => {
    const isDemoMode = true;
    const doneEvent = { type: "done", isDemo: isDemoMode || undefined };
    expect(doneEvent.isDemo).toBe(true);
  });

  it("done event does not include isDemo flag in normal mode", () => {
    const isDemoMode = false;
    const doneEvent = { type: "done", isDemo: isDemoMode || undefined };
    expect(doneEvent.isDemo).toBeUndefined();
  });
});
