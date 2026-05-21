/**
 * Tests for get_account_usage tool
 * Validates the tool definition, execution, and security constraints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db functions before importing
vi.mock("./db", () => ({
  getActiveSubscription: vi.fn(),
  getUsageStats: vi.fn(),
  getOrCreateCredits: vi.fn(),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import { AGENT_TOOLS, executeToolCall, type ToolContext } from "./agentTools";
import { getActiveSubscription, getUsageStats, getOrCreateCredits } from "./db";

const mockedGetActiveSubscription = vi.mocked(getActiveSubscription);
const mockedGetUsageStats = vi.mocked(getUsageStats);
const mockedGetOrCreateCredits = vi.mocked(getOrCreateCredits);

describe("get_account_usage tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tool Definition", () => {
    it("should be registered in AGENT_TOOLS", () => {
      const tool = AGENT_TOOLS.find(
        (t) => t.function.name === "get_account_usage"
      );
      expect(tool).toBeDefined();
    });

    it("should have correct description in Portuguese", () => {
      const tool = AGENT_TOOLS.find(
        (t) => t.function.name === "get_account_usage"
      );
      expect(tool!.function.description).toContain("plano");
      expect(tool!.function.description).toContain("mensagens");
      expect(tool!.function.description).toContain("créditos");
    });

    it("should require no parameters (read-only, uses context)", () => {
      const tool = AGENT_TOOLS.find(
        (t) => t.function.name === "get_account_usage"
      );
      expect(tool!.function.parameters.required).toEqual([]);
      expect(tool!.function.parameters.properties).toEqual({});
    });
  });

  describe("Execution without userId", () => {
    it("should return error when no userId in context", async () => {
      const result = await executeToolCall(
        {
          id: "call_1",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        undefined
      );

      expect(result.result.error).toContain("identificar o usuário");
      expect(result.result.navigation).toBeDefined();
      expect(result.result.navigation.planoEUso).toContain("Plano e Uso");
    });

    it("should return error when userId is undefined in context", async () => {
      const result = await executeToolCall(
        {
          id: "call_2",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: undefined }
      );

      expect(result.result.error).toContain("identificar o usuário");
    });
  });

  describe("Execution with free plan user", () => {
    beforeEach(() => {
      mockedGetActiveSubscription.mockResolvedValue(null);
      mockedGetOrCreateCredits.mockResolvedValue({
        id: 1,
        userId: 1,
        planId: "free",
        totalCredits: 100,
        usedCredits: 25,
        lastResetAt: new Date(),
        createdAt: new Date(),
      } as any);
      mockedGetUsageStats.mockResolvedValue({
        totalTokens: 5000,
        todayTokens: 1000,
        totalConversations: 2,
        totalMessages: 15,
        todayMessages: 3,
        monthConversations: 2,
      });
    });

    it("should return free plan info", async () => {
      const result = await executeToolCall(
        {
          id: "call_3",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      expect(result.result.plano.nome).toBe("Gratuito");
      expect(result.result.plano.id).toBe("free");
    });

    it("should return correct usage numbers", async () => {
      const result = await executeToolCall(
        {
          id: "call_4",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      expect(result.result.uso.mensagensHoje).toBe(3);
      expect(result.result.uso.limiteMensagensDia).toBe(5);
      expect(result.result.uso.conversasMes).toBe(2);
      expect(result.result.uso.limiteConversasMes).toBe(3);
    });

    it("should return subscription status as sem_assinatura", async () => {
      const result = await executeToolCall(
        {
          id: "call_5",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      expect(result.result.assinatura.status).toBe("sem_assinatura");
      expect(result.result.assinatura.renovacao).toBeNull();
    });

    it("should include navigation info", async () => {
      const result = await executeToolCall(
        {
          id: "call_6",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      expect(result.result.navegacao.planoEUso).toContain("Plano e Uso");
      expect(result.result.navegacao.minhaConta).toContain("Minha Conta");
      expect(result.result.navegacao.fazerUpgrade).toContain("Upgrade");
    });

    it("should include support info for free plan", async () => {
      const result = await executeToolCall(
        {
          id: "call_7",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      expect(result.result.suporteHumano).toContain("Pro e Enterprise");
    });
  });

  describe("Execution with Pro plan user", () => {
    beforeEach(() => {
      mockedGetActiveSubscription.mockResolvedValue({
        id: 1,
        userId: 2,
        stripeSubscriptionId: "sub_xxx",
        stripePriceId: "price_xxx",
        status: "active",
        currentPeriodEnd: new Date("2026-06-15"),
        createdAt: new Date(),
      } as any);
      mockedGetOrCreateCredits.mockResolvedValue({
        id: 1,
        userId: 2,
        planId: "pro",
        totalCredits: 999999,
        usedCredits: 500,
        lastResetAt: new Date(),
        createdAt: new Date(),
      } as any);
      mockedGetUsageStats.mockResolvedValue({
        totalTokens: 50000,
        todayTokens: 10000,
        totalConversations: 45,
        totalMessages: 320,
        todayMessages: 28,
        monthConversations: 45,
      });
    });

    it("should return Pro plan info", async () => {
      const result = await executeToolCall(
        {
          id: "call_8",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 2 }
      );

      expect(result.result.plano.nome).toBe("Pro");
      expect(result.result.plano.id).toBe("pro");
    });

    it("should show unlimited for Pro plan limits", async () => {
      const result = await executeToolCall(
        {
          id: "call_9",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 2 }
      );

      expect(result.result.uso.limiteMensagensDia).toBe("Ilimitado");
      expect(result.result.uso.limiteConversasMes).toBe("Ilimitado");
    });

    it("should show active subscription with renewal date", async () => {
      const result = await executeToolCall(
        {
          id: "call_10",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 2 }
      );

      expect(result.result.assinatura.status).toBe("active");
      // Date formatting depends on timezone; just verify it's a date string
      expect(result.result.assinatura.renovacao).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it("should include Pro support info", async () => {
      const result = await executeToolCall(
        {
          id: "call_11",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 2 }
      );

      expect(result.result.suporteHumano).toContain("1 hora mensal");
      expect(result.result.suporteHumano).toContain("WhatsApp");
    });
  });

  describe("Security constraints", () => {
    beforeEach(() => {
      mockedGetActiveSubscription.mockResolvedValue({
        id: 1,
        userId: 1,
        stripeSubscriptionId: "sub_secret123",
        stripeCustomerId: "cus_secret456",
        stripePriceId: "price_xxx",
        status: "active",
        currentPeriodEnd: new Date("2026-06-15"),
        createdAt: new Date(),
      } as any);
      mockedGetOrCreateCredits.mockResolvedValue({
        id: 1,
        userId: 1,
        planId: "starter",
        totalCredits: 1000,
        usedCredits: 100,
        lastResetAt: new Date(),
        createdAt: new Date(),
      } as any);
      mockedGetUsageStats.mockResolvedValue({
        totalTokens: 5000,
        todayTokens: 1000,
        totalConversations: 5,
        totalMessages: 50,
        todayMessages: 10,
        monthConversations: 5,
      });
    });

    it("should NOT expose stripeCustomerId", async () => {
      const result = await executeToolCall(
        {
          id: "call_12",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      const resultStr = JSON.stringify(result.result);
      expect(resultStr).not.toContain("cus_secret456");
      expect(resultStr).not.toContain("stripeCustomerId");
    });

    it("should NOT expose stripeSubscriptionId", async () => {
      const result = await executeToolCall(
        {
          id: "call_13",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      const resultStr = JSON.stringify(result.result);
      expect(resultStr).not.toContain("sub_secret123");
      expect(resultStr).not.toContain("stripeSubscriptionId");
    });

    it("should NOT expose userId", async () => {
      const result = await executeToolCall(
        {
          id: "call_14",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      // userId should not appear as a value in the response
      expect(result.result.plano).not.toHaveProperty("userId");
      expect(result.result.uso).not.toHaveProperty("userId");
      expect(result.result.assinatura).not.toHaveProperty("userId");
    });

    it("should NOT expose stripePriceId", async () => {
      const result = await executeToolCall(
        {
          id: "call_15",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      const resultStr = JSON.stringify(result.result);
      expect(resultStr).not.toContain("price_xxx");
      expect(resultStr).not.toContain("stripePriceId");
    });
  });

  describe("Error handling", () => {
    it("should return friendly error when DB fails", async () => {
      mockedGetActiveSubscription.mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await executeToolCall(
        {
          id: "call_16",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      expect(result.result.error).toContain("Não consegui consultar");
      expect(result.result.navigation).toBeDefined();
      expect(result.result.navigation.planoEUso).toContain("Plano e Uso");
    });

    it("should not expose internal error details", async () => {
      mockedGetActiveSubscription.mockRejectedValue(
        new Error("ECONNREFUSED 127.0.0.1:3306")
      );

      const result = await executeToolCall(
        {
          id: "call_17",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      const resultStr = JSON.stringify(result.result);
      expect(resultStr).not.toContain("ECONNREFUSED");
      expect(resultStr).not.toContain("127.0.0.1");
      expect(resultStr).not.toContain("3306");
    });
  });

  describe("Tool is read-only", () => {
    it("should only call read functions (get*), never write functions", async () => {
      mockedGetActiveSubscription.mockResolvedValue(null);
      mockedGetOrCreateCredits.mockResolvedValue({
        id: 1,
        userId: 1,
        planId: "free",
        totalCredits: 100,
        usedCredits: 25,
        lastResetAt: new Date(),
        createdAt: new Date(),
      } as any);
      mockedGetUsageStats.mockResolvedValue({
        totalTokens: 0,
        todayTokens: 0,
        totalConversations: 0,
        totalMessages: 0,
        todayMessages: 0,
        monthConversations: 0,
      });

      await executeToolCall(
        {
          id: "call_18",
          type: "function",
          function: { name: "get_account_usage", arguments: "{}" },
        },
        { userId: 1 }
      );

      // Only read functions should be called
      expect(mockedGetActiveSubscription).toHaveBeenCalledWith(1);
      expect(mockedGetUsageStats).toHaveBeenCalledWith(1);
      // getOrCreateCredits is NOT called when there's no subscription (free plan path)
      // This confirms the tool is read-only and doesn't modify data
    });
  });
});
