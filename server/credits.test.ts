import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@debuga.ai",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("account.credits", () => {
  it("returns credits info for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.credits();

    expect(result).toHaveProperty("credits");
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("hasSubscription");
    expect(result.plan).toHaveProperty("id");
    expect(result.plan).toHaveProperty("name");
    expect(result.plan).toHaveProperty("limits");
    expect(result.plan.limits).toHaveProperty("messagesPerDay");
    expect(result.plan.limits).toHaveProperty("conversationsPerMonth");
  });

  it("returns free plan for users without subscription", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.credits();

    expect(result.plan.id).toBe("free");
    expect(result.hasSubscription).toBe(false);
  });

  it("credits object has required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.credits();

    expect(result.credits).toHaveProperty("totalCredits");
    expect(result.credits).toHaveProperty("usedCredits");
    expect(result.credits).toHaveProperty("planId");
    expect(typeof result.credits!.totalCredits).toBe("number");
    expect(typeof result.credits!.usedCredits).toBe("number");
  });
});

describe("account.usageStats", () => {
  it("returns usage statistics for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.usageStats();

    expect(result).toHaveProperty("totalTokens");
    expect(result).toHaveProperty("todayTokens");
    expect(result).toHaveProperty("totalConversations");
    expect(result).toHaveProperty("totalMessages");
    expect(typeof result.totalTokens).toBe("number");
    expect(typeof result.todayTokens).toBe("number");
  });
});

describe("account.usageHistory", () => {
  it("returns usage history array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.usageHistory({ limit: 10 });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("account.profile", () => {
  it("returns user profile info", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.profile();

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("role");
    expect(result.email).toBe("test@debuga.ai");
    expect(result.name).toBe("Test User");
    expect(result.role).toBe("user");
  });
});

describe("db helpers - credits", () => {
  it("getOrCreateCredits creates credits for new user", async () => {
    const { getOrCreateCredits } = await import("./db");

    const creds = await getOrCreateCredits(1, "free");
    expect(creds).toBeDefined();
    expect(creds!.planId).toBe("free");
    expect(creds!.totalCredits).toBeGreaterThanOrEqual(0);
  });

  it("getTodayMessageCount returns a number", async () => {
    const { getTodayMessageCount } = await import("./db");

    const count = await getTodayMessageCount(1);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("getMonthConversationCount returns a number", async () => {
    const { getMonthConversationCount } = await import("./db");

    const count = await getMonthConversationCount(1);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe("account.usage", () => {
  it("returns real usage data with plan limits", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.usage();

    expect(result).toHaveProperty("planId");
    expect(result).toHaveProperty("planName");
    expect(result).toHaveProperty("todayMessages");
    expect(result).toHaveProperty("monthConversations");
    expect(result).toHaveProperty("limits");
    expect(result.limits).toHaveProperty("messagesPerDay");
    expect(result.limits).toHaveProperty("conversationsPerMonth");
    expect(result).toHaveProperty("isAdmin");
    expect(typeof result.todayMessages).toBe("number");
    expect(typeof result.monthConversations).toBe("number");
    expect(result.todayMessages).toBeGreaterThanOrEqual(0);
    expect(result.monthConversations).toBeGreaterThanOrEqual(0);
  });

  it("returns free plan for user without subscription", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.usage();

    expect(result.planId).toBe("free");
    expect(result.limits.messagesPerDay).toBe(5);
    expect(result.limits.conversationsPerMonth).toBe(3);
    expect(result.isAdmin).toBe(false);
  });

  it("admin flag is true for admin users", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.account.usage();

    expect(result.isAdmin).toBe(true);
  });
});

describe("rate limiter", () => {
  it("PLANS have valid limits", async () => {
    const { PLANS } = await import("./products");

    for (const plan of PLANS) {
      expect(plan.limits.messagesPerDay).toBeGreaterThan(0);
      expect(plan.limits.conversationsPerMonth).toBeGreaterThan(0);
      expect(plan.limits.maxTokensPerMessage).toBeGreaterThan(0);
    }

    // Free plan has strictest limits
    const free = PLANS.find(p => p.id === "free")!;
    const starter = PLANS.find(p => p.id === "starter")!;
    expect(free.limits.messagesPerDay).toBeLessThan(starter.limits.messagesPerDay);
    expect(free.limits.conversationsPerMonth).toBeLessThan(starter.limits.conversationsPerMonth);
  });
});
