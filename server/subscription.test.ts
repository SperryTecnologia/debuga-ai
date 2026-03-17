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

describe("subscription.status", () => {
  it("returns subscription status for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result).toHaveProperty("hasActiveSubscription");
    expect(result).toHaveProperty("isAdmin");
    expect(typeof result.hasActiveSubscription).toBe("boolean");
    expect(typeof result.isAdmin).toBe("boolean");
  });

  it("identifies admin users correctly", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.isAdmin).toBe(true);
  });

  it("identifies regular users correctly", async () => {
    const ctx = createAuthContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.isAdmin).toBe(false);
  });
});

describe("products configuration", () => {
  it("has valid plan definitions", async () => {
    const { PLANS, getPlanById } = await import("./products");

    expect(PLANS).toHaveLength(3);
    expect(PLANS.map((p) => p.id)).toEqual(["starter", "pro", "enterprise"]);

    // Each plan should have required fields
    for (const plan of PLANS) {
      expect(plan.name).toBeTruthy();
      expect(plan.description).toBeTruthy();
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.stripe.priceMonthly).toBeGreaterThan(0);
      expect(plan.stripe.priceYearly).toBeGreaterThan(0);
      expect(plan.stripe.currency).toBe("brl");
    }
  });

  it("getPlanById returns correct plan", async () => {
    const { getPlanById } = await import("./products");

    const pro = getPlanById("pro");
    expect(pro).toBeDefined();
    expect(pro!.name).toBe("Pro");
    expect(pro!.popular).toBe(true);

    const invalid = getPlanById("nonexistent");
    expect(invalid).toBeUndefined();
  });

  it("yearly prices are cheaper than 12x monthly", async () => {
    const { PLANS } = await import("./products");

    for (const plan of PLANS) {
      const yearlyEquivalent = plan.stripe.priceMonthly * 12;
      expect(plan.stripe.priceYearly).toBeLessThan(yearlyEquivalent);
    }
  });

  it("pro plan is marked as popular", async () => {
    const { PLANS } = await import("./products");

    const popular = PLANS.filter((p) => p.popular);
    expect(popular).toHaveLength(1);
    expect(popular[0].id).toBe("pro");
  });
});

describe("chat router - authenticated", () => {
  it("can list conversations for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conversations = await caller.chat.listConversations();
    expect(Array.isArray(conversations)).toBe(true);
  });

  it("can create a new conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({});
    expect(conv).toHaveProperty("id");
    expect(typeof conv.id).toBe("number");
  });
});
