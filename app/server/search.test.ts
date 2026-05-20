import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  listConversations: vi.fn().mockResolvedValue([]),
  listArchivedConversations: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn().mockResolvedValue({ id: 1, title: "Test", userId: 1, isArchived: false, isPinned: false }),
  getConversation: vi.fn().mockResolvedValue({ id: 1, title: "Test", userId: 1, isArchived: false }),
  updateConversationTitle: vi.fn().mockResolvedValue(undefined),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  togglePinConversation: vi.fn().mockResolvedValue(true),
  archiveConversation: vi.fn().mockResolvedValue(undefined),
  unarchiveConversation: vi.fn().mockResolvedValue(undefined),
  addMessage: vi.fn().mockResolvedValue({ id: 1 }),
  getMessages: vi.fn().mockResolvedValue([]),
  getActiveSubscription: vi.fn().mockResolvedValue(null),
  getOrCreateCredits: vi.fn().mockResolvedValue({ id: 1, userId: 1, balance: 100, monthlyAllowance: 100, lastResetAt: new Date() }),
  getUsageStats: vi.fn().mockResolvedValue({ todayMessages: 0, monthConversations: 0 }),
  getUsageLogs: vi.fn().mockResolvedValue([]),
  getMonthConversationCount: vi.fn().mockResolvedValue(0),
  getTodayMessageCount: vi.fn().mockResolvedValue(0),
  resetCreditsIfNeeded: vi.fn().mockResolvedValue(undefined),
  recordMessageSent: vi.fn().mockResolvedValue(undefined),
  recordConversationStarted: vi.fn().mockResolvedValue(undefined),
  searchConversations: vi.fn().mockResolvedValue({ results: [], total: 0 }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: "Test" } }] }),
}));

vi.mock("./products", () => ({
  PLANS: {
    free: { id: "free", name: "Free", monthlyConversations: 3, dailyMessages: 5, maxTokens: 2048, tools: [], features: [] },
    starter: { id: "starter", name: "Starter", monthlyConversations: 30, dailyMessages: 100, maxTokens: 4096, tools: ["dns_lookup"], features: [] },
    pro: { id: "pro", name: "Pro", monthlyConversations: -1, dailyMessages: -1, maxTokens: 8192, tools: ["all"], features: [] },
  },
}));

import { appRouter } from "./routers";
import * as db from "./db";

type TrpcContext = {
  user: { id: number; openId: string; name: string; email: string; role: string; stripeCustomerId: string | null } | null;
  req: any;
  res: any;
};

function createAuthContext(overrides?: Partial<NonNullable<TrpcContext["user"]>>): TrpcContext {
  return {
    user: { id: 1, openId: "test-open-id", name: "Test User", email: "test@test.com", role: "user", stripeCustomerId: null, ...overrides },
    req: { headers: { origin: "http://localhost:3000" } },
    res: { setHeader: vi.fn(), end: vi.fn() },
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { headers: { origin: "http://localhost:3000" } },
    res: { setHeader: vi.fn(), end: vi.fn() },
  };
}

const caller = appRouter.createCaller(createAuthContext());
const user2Caller = appRouter.createCaller(createAuthContext({ id: 2, openId: "user-2", name: "User 2", email: "user2@test.com" }));
const unauthCaller = appRouter.createCaller(createUnauthContext());

describe("Search System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("chat.search — authentication", () => {
    it("should require authentication", async () => {
      await expect(
        unauthCaller.chat.search({ query: "test" })
      ).rejects.toThrow();
    });

    it("should work for authenticated users", async () => {
      const result = await caller.chat.search({ query: "test" });
      expect(result).toEqual({ results: [], total: 0 });
      expect(db.searchConversations).toHaveBeenCalledWith(1, "test", {
        includeArchived: false,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe("chat.search — user isolation", () => {
    it("should pass correct userId for user 1", async () => {
      await caller.chat.search({ query: "firewall" });
      expect(db.searchConversations).toHaveBeenCalledWith(1, "firewall", expect.any(Object));
    });

    it("should pass correct userId for user 2", async () => {
      await user2Caller.chat.search({ query: "firewall" });
      expect(db.searchConversations).toHaveBeenCalledWith(2, "firewall", expect.any(Object));
    });

    it("should never mix user IDs between callers", async () => {
      await caller.chat.search({ query: "dns" });
      await user2Caller.chat.search({ query: "dns" });

      const calls = vi.mocked(db.searchConversations).mock.calls;
      expect(calls[0][0]).toBe(1);
      expect(calls[1][0]).toBe(2);
    });
  });

  describe("chat.search — input validation", () => {
    it("should reject empty query", async () => {
      await expect(
        caller.chat.search({ query: "" })
      ).rejects.toThrow();
    });

    it("should accept query with min 1 character", async () => {
      await caller.chat.search({ query: "a" });
      expect(db.searchConversations).toHaveBeenCalled();
    });

    it("should pass includeArchived option", async () => {
      await caller.chat.search({ query: "test", includeArchived: true });
      expect(db.searchConversations).toHaveBeenCalledWith(1, "test", {
        includeArchived: true,
        limit: 20,
        offset: 0,
      });
    });

    it("should pass custom limit and offset", async () => {
      await caller.chat.search({ query: "test", limit: 10, offset: 5 });
      expect(db.searchConversations).toHaveBeenCalledWith(1, "test", {
        includeArchived: false,
        limit: 10,
        offset: 5,
      });
    });

    it("should use default includeArchived=false", async () => {
      await caller.chat.search({ query: "test" });
      expect(db.searchConversations).toHaveBeenCalledWith(1, "test", expect.objectContaining({
        includeArchived: false,
      }));
    });
  });

  describe("chat.search — results format", () => {
    it("should return title match results", async () => {
      const mockResults = {
        results: [
          {
            conversationId: 1,
            title: "DNS Configuration",
            isArchived: false,
            matchType: "title" as const,
            snippet: null,
            messageRole: null,
            updatedAt: new Date("2026-01-15"),
          },
        ],
        total: 1,
      };
      vi.mocked(db.searchConversations).mockResolvedValueOnce(mockResults);

      const result = await caller.chat.search({ query: "DNS" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matchType).toBe("title");
      expect(result.results[0].snippet).toBeNull();
      expect(result.total).toBe(1);
    });

    it("should return message match results with snippet", async () => {
      const mockResults = {
        results: [
          {
            conversationId: 2,
            title: "Security Audit",
            isArchived: false,
            matchType: "message" as const,
            snippet: "...checking SPF records for the domain...",
            messageRole: "assistant",
            updatedAt: new Date("2026-01-14"),
          },
        ],
        total: 1,
      };
      vi.mocked(db.searchConversations).mockResolvedValueOnce(mockResults);

      const result = await caller.chat.search({ query: "SPF" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matchType).toBe("message");
      expect(result.results[0].snippet).toContain("SPF");
    });

    it("should return archived results with isArchived flag", async () => {
      const mockResults = {
        results: [
          {
            conversationId: 3,
            title: "Old Firewall Config",
            isArchived: true,
            matchType: "title" as const,
            snippet: null,
            messageRole: null,
            updatedAt: new Date("2025-12-01"),
          },
        ],
        total: 1,
      };
      vi.mocked(db.searchConversations).mockResolvedValueOnce(mockResults);

      const result = await caller.chat.search({ query: "firewall", includeArchived: true });
      expect(result.results[0].isArchived).toBe(true);
    });

    it("should return empty results for no matches", async () => {
      vi.mocked(db.searchConversations).mockResolvedValueOnce({ results: [], total: 0 });

      const result = await caller.chat.search({ query: "nonexistent" });
      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("chat.search — does not affect usage", () => {
    it("should not call recordMessageSent", async () => {
      await caller.chat.search({ query: "test" });
      expect(db.recordMessageSent).not.toHaveBeenCalled();
    });

    it("should not call recordConversationStarted", async () => {
      await caller.chat.search({ query: "test" });
      expect(db.recordConversationStarted).not.toHaveBeenCalled();
    });

    it("should not call resetCreditsIfNeeded", async () => {
      await caller.chat.search({ query: "test" });
      expect(db.resetCreditsIfNeeded).not.toHaveBeenCalled();
    });
  });
});
