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

function createAuthContext(overrides?: Partial<TrpcContext["user"]>): TrpcContext {
  return {
    user: { id: 1, openId: "test-open-id", name: "Test User", email: "test@test.com", role: "user", stripeCustomerId: null, ...overrides },
    req: { headers: { origin: "http://localhost:3000" } },
    res: { setHeader: vi.fn(), end: vi.fn() },
  };
}

const caller = appRouter.createCaller(createAuthContext());
const adminCaller = appRouter.createCaller(createAuthContext({ role: "admin" }));

describe("Archive System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("chat.archive", () => {
    it("should archive a conversation", async () => {
      const result = await caller.chat.archive({ id: 1 });
      expect(result.success).toBe(true);
      expect(db.archiveConversation).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("chat.unarchive", () => {
    it("should unarchive a conversation", async () => {
      const result = await caller.chat.unarchive({ id: 1 });
      expect(result.success).toBe(true);
      expect(db.unarchiveConversation).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("chat.listArchived", () => {
    it("should list archived conversations", async () => {
      const mockArchived = [
        { id: 2, title: "Archived conv", userId: 1, isArchived: true, isPinned: false },
      ];
      vi.mocked(db.listArchivedConversations).mockResolvedValueOnce(mockArchived as any);

      const result = await caller.chat.listArchived();
      expect(result).toEqual(mockArchived);
      expect(db.listArchivedConversations).toHaveBeenCalledWith(1);
    });

    it("should return empty array when no archived conversations", async () => {
      vi.mocked(db.listArchivedConversations).mockResolvedValueOnce([]);
      const result = await caller.chat.listArchived();
      expect(result).toEqual([]);
    });
  });

  describe("chat.deleteConversation", () => {
    it("should delete a conversation", async () => {
      const result = await caller.chat.deleteConversation({ id: 1 });
      expect(result.success).toBe(true);
      expect(db.deleteConversation).toHaveBeenCalledWith(1, 1);
    });

    it("should not affect usage_events when deleting", async () => {
      // Delete should not call any usage recording functions
      await caller.chat.deleteConversation({ id: 1 });
      expect(db.recordMessageSent).not.toHaveBeenCalled();
      expect(db.recordConversationStarted).not.toHaveBeenCalled();
    });
  });

  describe("archive does not affect usage", () => {
    it("archiving should not call any usage recording functions", async () => {
      await caller.chat.archive({ id: 1 });
      expect(db.recordMessageSent).not.toHaveBeenCalled();
      expect(db.recordConversationStarted).not.toHaveBeenCalled();
    });

    it("unarchiving should not call any usage recording functions", async () => {
      await caller.chat.unarchive({ id: 1 });
      expect(db.recordMessageSent).not.toHaveBeenCalled();
      expect(db.recordConversationStarted).not.toHaveBeenCalled();
    });
  });
});
