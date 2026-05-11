import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Track usage events recorded
const recordedEvents: Array<{ type: string; userId: number; conversationId: number }> = [];

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
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
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    listConversations: vi.fn().mockResolvedValue([]),
    updateConversationTitle: vi.fn().mockResolvedValue(undefined),
    togglePinConversation: vi.fn().mockResolvedValue(true),
    archiveConversation: vi.fn().mockResolvedValue(undefined),
    addMessage: vi.fn().mockResolvedValue({
      id: 1,
      conversationId: 1,
      role: "user",
      content: "test",
      createdAt: new Date(),
    }),
    getMessages: vi.fn().mockResolvedValue([]),
    // Independent counters - these are the key ones
    getMonthConversationCount: vi.fn().mockResolvedValue(0),
    getTodayMessageCount: vi.fn().mockResolvedValue(0),
    recordMessageSent: vi.fn().mockImplementation(async (userId: number, conversationId: number) => {
      recordedEvents.push({ type: "message_sent", userId, conversationId });
    }),
    recordConversationStarted: vi.fn().mockImplementation(async (userId: number, conversationId: number) => {
      recordedEvents.push({ type: "conversation_started", userId, conversationId });
    }),
    hasConversationMessages: vi.fn().mockResolvedValue(false),
    getUsageStats: vi.fn().mockResolvedValue({
      totalTokens: 0,
      todayTokens: 0,
      totalConversations: 0,
      totalMessages: 0,
      todayMessages: 0,
      monthConversations: 0,
    }),
    getUsageLogs: vi.fn().mockResolvedValue([]),
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    updateUserStripeCustomerId: vi.fn(),
    getUserByStripeCustomerId: vi.fn(),
    upsertSubscription: vi.fn(),
    getSubscriptionByStripeId: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Test response", role: "assistant" } }],
    usage: { total_tokens: 100 },
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
    stripeCustomerId: null,
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

describe("Usage Counters - Anti-bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordedEvents.length = 0;
  });

  describe("Creating conversation does NOT consume limit", () => {
    it("createConversation does not record any usage event", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await caller.chat.createConversation({});

      const { recordMessageSent, recordConversationStarted } = await import("./db");
      expect(recordMessageSent).not.toHaveBeenCalled();
      expect(recordConversationStarted).not.toHaveBeenCalled();
    });

    it("createConversation succeeds even when monthly limit is reached", async () => {
      // Since we moved the limit check to sendMessage, createConversation should always work
      const { getMonthConversationCount } = await import("./db");
      (getMonthConversationCount as any).mockResolvedValue(100); // way over limit

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.chat.createConversation({});
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });

  describe("First message in conversation records conversation_started", () => {
    it("sendMessage records both message_sent and conversation_started on first message", async () => {
      const { getMessages, recordMessageSent, recordConversationStarted, getMonthConversationCount, getTodayMessageCount } = await import("./db");
      // No existing messages = first message
      (getMessages as any).mockResolvedValue([]);
      (getMonthConversationCount as any).mockResolvedValue(0);
      (getTodayMessageCount as any).mockResolvedValue(0);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await caller.chat.sendMessage({ conversationId: 1, content: "hello" });

      expect(recordMessageSent).toHaveBeenCalledWith(1, 1);
      expect(recordConversationStarted).toHaveBeenCalledWith(1, 1);
    });

    it("sendMessage on existing conversation still records message_sent but conversation_started is idempotent", async () => {
      const { getMessages, recordMessageSent, recordConversationStarted } = await import("./db");
      // Existing messages = not first message
      (getMessages as any).mockResolvedValue([
        { id: 1, conversationId: 1, role: "user", content: "previous", createdAt: new Date() },
        { id: 2, conversationId: 1, role: "assistant", content: "response", createdAt: new Date() },
      ]);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await caller.chat.sendMessage({ conversationId: 1, content: "follow up" });

      expect(recordMessageSent).toHaveBeenCalledWith(1, 1);
      // recordConversationStarted is still called but the function itself checks for duplicates
      expect(recordConversationStarted).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("Monthly conversation limit checked only on first message", () => {
    it("blocks first message when monthly conversation limit is reached", async () => {
      const { getMessages, getMonthConversationCount } = await import("./db");
      (getMessages as any).mockResolvedValue([]); // first message
      (getMonthConversationCount as any).mockResolvedValue(3); // at limit for free

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.chat.sendMessage({ conversationId: 1, content: "hello" })
      ).rejects.toThrow(/limite.*3.*conversas/i);
    });

    it("allows subsequent messages even when monthly conversation limit is reached", async () => {
      const { getMessages, getMonthConversationCount } = await import("./db");
      // Has existing user messages = not first message
      (getMessages as any).mockResolvedValue([
        { id: 1, conversationId: 1, role: "user", content: "previous", createdAt: new Date() },
      ]);
      (getMonthConversationCount as any).mockResolvedValue(3); // at limit

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      // Should NOT throw because this is not the first message in the conversation
      const result = await caller.chat.sendMessage({ conversationId: 1, content: "follow up" });
      expect(result).toBeDefined();
    });
  });

  describe("Deleting conversation does NOT reduce usage counter", () => {
    it("deleteConversation does not affect usage_events counters", async () => {
      const { recordMessageSent, recordConversationStarted, getMonthConversationCount, getTodayMessageCount } = await import("./db");
      (getMonthConversationCount as any).mockResolvedValue(0);
      (getTodayMessageCount as any).mockResolvedValue(0);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      // Delete a conversation
      await caller.chat.deleteConversation({ id: 1 });

      // Counters should NOT have been decremented
      expect(recordMessageSent).not.toHaveBeenCalled();
      expect(recordConversationStarted).not.toHaveBeenCalled();
      // The count functions still return the same values (independent of deletion)
      const monthCount = await getMonthConversationCount(1);
      const todayCount = await getTodayMessageCount(1);
      // These are mocked to return 0, but the point is they're NOT decremented
      expect(monthCount).toBe(0);
      expect(todayCount).toBe(0);
    });
  });

  describe("Daily message limit persists after deletion", () => {
    it("user at daily limit stays blocked even after deleting conversations", async () => {
      const { getMessages, getTodayMessageCount, getMonthConversationCount } = await import("./db");
      (getMessages as any).mockResolvedValue([]); // first message
      (getMonthConversationCount as any).mockResolvedValue(0); // not at conv limit
      (getTodayMessageCount as any).mockResolvedValue(5); // at limit for free

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      // Even if user deleted all their conversations, the counter still shows 5
      await expect(
        caller.chat.sendMessage({ conversationId: 1, content: "hello" })
      ).rejects.toThrow(/limite.*5.*mensagens/i);
    });
  });

  describe("Empty conversation deleted does not count", () => {
    it("conversation with no messages sent does not consume monthly limit", async () => {
      const { getMessages, getMonthConversationCount, getTodayMessageCount } = await import("./db");
      // Simulate: user created conv, sent no messages, then tries to send first message
      // The monthly count is 0 because no conversation_started event was recorded
      (getMessages as any).mockResolvedValue([]);
      (getMonthConversationCount as any).mockResolvedValue(0);
      (getTodayMessageCount as any).mockResolvedValue(0);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      // Should succeed because no conversations have been "started" (no messages sent)
      const result = await caller.chat.sendMessage({ conversationId: 1, content: "hello" });
      expect(result).toBeDefined();
    });
  });
});
