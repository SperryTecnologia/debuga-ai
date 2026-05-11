import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the database module
vi.mock("./db", () => {
  let conversationIdCounter = 1;
  let messageIdCounter = 1;
  const conversations: any[] = [];
  const messages: any[] = [];

  return {
    createConversation: vi.fn(async (userId: number, title?: string) => {
      const conv = {
        id: conversationIdCounter++,
        userId,
        title: title || "Nova conversa",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      conversations.push(conv);
      return conv;
    }),
    listConversations: vi.fn(async (userId: number) => {
      return conversations
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }),
    getConversation: vi.fn(async (id: number, userId: number) => {
      return conversations.find((c) => c.id === id && c.userId === userId) || null;
    }),
    updateConversationTitle: vi.fn(async (id: number, userId: number, title: string) => {
      const conv = conversations.find((c) => c.id === id && c.userId === userId);
      if (conv) conv.title = title;
    }),
    deleteConversation: vi.fn(async (id: number, userId: number) => {
      const idx = conversations.findIndex((c) => c.id === id && c.userId === userId);
      if (idx >= 0) conversations.splice(idx, 1);
    }),
    togglePinConversation: vi.fn(async (id: number, userId: number) => {
      const conv = conversations.find((c) => c.id === id && c.userId === userId);
      if (!conv) throw new Error("Conversation not found");
      conv.isPinned = !conv.isPinned;
      return conv.isPinned;
    }),
    archiveConversation: vi.fn(async (id: number, userId: number) => {
      const conv = conversations.find((c) => c.id === id && c.userId === userId);
      if (conv) {
        conv.isArchived = true;
        conv.isPinned = false;
      }
    }),
    getActiveSubscription: vi.fn(async () => null),
    addMessage: vi.fn(async (data: any) => {
      const msg = {
        id: messageIdCounter++,
        ...data,
        createdAt: new Date(),
      };
      messages.push(msg);
      return msg;
    }),
    getMessages: vi.fn(async (conversationId: number) => {
      return messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }),
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    updateUserStripeCustomerId: vi.fn(),
    getUserByStripeCustomerId: vi.fn(),
    upsertSubscription: vi.fn(),
    getSubscriptionByStripeId: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
    getMonthConversationCount: vi.fn(async () => 0),
    getTodayMessageCount: vi.fn(async () => 0),
    resetCreditsIfNeeded: vi.fn(async () => undefined),
    getOrCreateCredits: vi.fn(async () => ({
      id: 1,
      userId: 1,
      totalCredits: 50,
      usedCredits: 0,
      planId: "free",
      resetAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
});

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Resposta de teste do agente debuga.ai",
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  })),
}));

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@sperry.com.br",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("chat.createConversation", () => {
  it("creates a new conversation for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.createConversation({});

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.userId).toBe(1);
    expect(result.title).toBe("Nova conversa");
  });

  it("creates a conversation with custom title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.createConversation({ title: "Análise de Segurança" });

    expect(result.title).toBe("Análise de Segurança");
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.chat.createConversation({})).rejects.toThrow();
  });
});

describe("chat.listConversations", () => {
  it("returns conversations for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.listConversations();

    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.chat.listConversations()).rejects.toThrow();
  });
});

describe("chat.updateTitle", () => {
  it("updates conversation title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({});
    const result = await caller.chat.updateTitle({
      id: conv.id,
      title: "Novo Título",
    });

    expect(result).toEqual({ success: true });
  });
});

describe("chat.deleteConversation", () => {
  it("deletes a conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({});
    const result = await caller.chat.deleteConversation({ id: conv.id });

    expect(result).toEqual({ success: true });
  });
});

describe("chat.sendMessage", () => {
  it("sends a message and receives AI response", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({});
    const result = await caller.chat.sendMessage({
      conversationId: conv.id,
      content: "Como fazer hardening em um servidor Linux?",
    });

    expect(result.userMessage).toBeDefined();
    expect(result.userMessage.role).toBe("user");
    expect(result.userMessage.content).toBe("Como fazer hardening em um servidor Linux?");
    expect(result.assistantMessage).toBeDefined();
    expect(result.assistantMessage.role).toBe("assistant");
    expect(result.assistantMessage.content).toBe("Resposta de teste do agente debuga.ai");
  });

  it("rejects empty messages", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({});

    await expect(
      caller.chat.sendMessage({ conversationId: conv.id, content: "" })
    ).rejects.toThrow();
  });

  it("rejects messages for non-existent conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.sendMessage({ conversationId: 99999, content: "test" })
    ).rejects.toThrow();
  });
});

describe("chat.getMessages", () => {
  it("returns messages for a conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({});
    await caller.chat.sendMessage({
      conversationId: conv.id,
      content: "Teste de mensagem",
    });

    const msgs = await caller.chat.getMessages({ conversationId: conv.id });
    expect(Array.isArray(msgs)).toBe(true);
  });

  it("rejects unauthenticated access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.getMessages({ conversationId: 1 })
    ).rejects.toThrow();
  });
});

describe("chat.togglePin", () => {
  it("toggles pin status of a conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({ title: "Pin Test" });
    const result = await caller.chat.togglePin({ id: conv.id });

    expect(result).toEqual({ success: true, isPinned: true });
  });

  it("unpins a pinned conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({ title: "Unpin Test" });
    await caller.chat.togglePin({ id: conv.id });
    const result = await caller.chat.togglePin({ id: conv.id });

    expect(result).toEqual({ success: true, isPinned: false });
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.chat.togglePin({ id: 1 })).rejects.toThrow();
  });
});

describe("chat.archive", () => {
  it("archives a conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const conv = await caller.chat.createConversation({ title: "Archive Test" });
    const result = await caller.chat.archive({ id: conv.id });

    expect(result).toEqual({ success: true });
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.chat.archive({ id: 1 })).rejects.toThrow();
  });
});

describe("auth.me", () => {
  it("returns user data for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@sperry.com.br");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});
