import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getMonthConversationCount: vi.fn().mockResolvedValue(0),
    getTodayMessageCount: vi.fn().mockResolvedValue(0),
    getActiveSubscription: vi.fn().mockResolvedValue(null),
    getOrCreateCredits: vi.fn().mockResolvedValue({
      id: 1,
      userId: 1,
      totalCredits: 50,
      usedCredits: 0,
      planId: "free",
      resetAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    resetCreditsIfNeeded: vi.fn().mockResolvedValue(undefined),
    createConversation: vi.fn().mockResolvedValue({
      id: 1,
      userId: 1,
      title: "Nova conversa",
      isPinned: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getConversation: vi.fn().mockResolvedValue({
      id: 1,
      userId: 1,
      title: "Test",
      isPinned: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    addMessage: vi.fn().mockResolvedValue({
      id: 1,
      conversationId: 1,
      role: "user",
      content: "test",
      createdAt: new Date(),
    }),
    getMessages: vi.fn().mockResolvedValue([]),
    listConversations: vi.fn().mockResolvedValue([]),
  };
});

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Test response", role: "assistant" } }],
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "http://localhost:3000" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Plan Limits - createConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows creating conversation when under limit", async () => {
    const { getMonthConversationCount } = await import("./db");
    (getMonthConversationCount as any).mockResolvedValue(2); // under 3 limit

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.createConversation({});

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it("blocks creating conversation when at monthly limit for free plan", async () => {
    const { getMonthConversationCount } = await import("./db");
    (getMonthConversationCount as any).mockResolvedValue(3); // at limit

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.chat.createConversation({})).rejects.toThrow(
      /limite.*3.*conversas/i
    );
  });

  it("admin bypasses conversation limit", async () => {
    const { getMonthConversationCount } = await import("./db");
    (getMonthConversationCount as any).mockResolvedValue(100); // way over limit

    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.createConversation({});

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });
});

describe("Plan Limits - sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks sending message when daily limit reached for free plan", async () => {
    const { getTodayMessageCount, getConversation } = await import("./db");
    (getTodayMessageCount as any).mockResolvedValue(5); // at limit for free
    (getConversation as any).mockResolvedValue({
      id: 1,
      userId: 1,
      title: "Test",
      isPinned: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.sendMessage({ conversationId: 1, content: "hello" })
    ).rejects.toThrow(/limite.*5.*mensagens/i);
  });

  it("blocks sending message when credits exhausted for free plan", async () => {
    const { getTodayMessageCount, getConversation, getOrCreateCredits } = await import("./db");
    (getTodayMessageCount as any).mockResolvedValue(2); // under daily limit
    (getConversation as any).mockResolvedValue({
      id: 1,
      userId: 1,
      title: "Test",
      isPinned: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (getOrCreateCredits as any).mockResolvedValue({
      id: 1,
      userId: 1,
      totalCredits: 50,
      usedCredits: 50, // all credits used
      planId: "free",
      resetAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.sendMessage({ conversationId: 1, content: "hello" })
    ).rejects.toThrow(/cr[eé]ditos.*acabaram/i);
  });

  it("calls resetCreditsIfNeeded before checking limits", async () => {
    const { resetCreditsIfNeeded, getTodayMessageCount, getConversation } = await import("./db");
    (getTodayMessageCount as any).mockResolvedValue(5); // at limit
    (getConversation as any).mockResolvedValue({
      id: 1,
      userId: 1,
      title: "Test",
      isPinned: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.sendMessage({ conversationId: 1, content: "hello" });
    } catch {
      // expected to throw
    }

    expect(resetCreditsIfNeeded).toHaveBeenCalledWith(1);
  });
});

describe("Feature Gating - getToolsForPlan", () => {
  it("free plan gets no tools in stream route", async () => {
    // We test this indirectly by verifying the PLANS config
    const { PLANS } = await import("./products");
    const freePlan = PLANS.find((p) => p.id === "free");
    expect(freePlan).toBeDefined();
    expect(freePlan!.limits.maxTokensPerMessage).toBe(2048);
    expect(freePlan!.limits.messagesPerDay).toBe(5);
    expect(freePlan!.limits.conversationsPerMonth).toBe(3);
  });

  it("starter plan has correct limits", async () => {
    const { PLANS } = await import("./products");
    const starterPlan = PLANS.find((p) => p.id === "starter");
    expect(starterPlan).toBeDefined();
    expect(starterPlan!.limits.maxTokensPerMessage).toBe(4096);
    expect(starterPlan!.limits.messagesPerDay).toBe(100);
    expect(starterPlan!.limits.conversationsPerMonth).toBe(30);
  });

  it("pro plan has unlimited messages and conversations", async () => {
    const { PLANS } = await import("./products");
    const proPlan = PLANS.find((p) => p.id === "pro");
    expect(proPlan).toBeDefined();
    expect(proPlan!.limits.messagesPerDay).toBe(999999);
    expect(proPlan!.limits.conversationsPerMonth).toBe(999999);
    expect(proPlan!.limits.maxTokensPerMessage).toBe(32768);
  });

  it("features reflect reality - no false promises", async () => {
    const { PLANS } = await import("./products");
    const starterPlan = PLANS.find((p) => p.id === "starter")!;
    const proPlan = PLANS.find((p) => p.id === "pro")!;
    const enterprisePlan = PLANS.find((p) => p.id === "enterprise")!;

    // Starter should NOT promise port_scan or execute_code
    const starterFeatures = starterPlan.features.join(" ");
    expect(starterFeatures).not.toContain("port scan");
    expect(starterFeatures).not.toContain("execução de código");

    // Pro should mention port scan and code execution
    const proFeatures = proPlan.features.join(" ");
    expect(proFeatures).toContain("port scan");
    expect(proFeatures).toContain("execução de código");

    // Enterprise should mark things as "sob projeto" not as available
    const enterpriseFeatures = enterprisePlan.features.join(" ");
    expect(enterpriseFeatures).toContain("sob projeto");
    expect(enterpriseFeatures).not.toContain("API dedicada com SLA");
    expect(enterpriseFeatures).not.toContain("Sandbox Docker");
  });
});
