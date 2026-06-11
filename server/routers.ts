import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminRouter } from "./adminRouters";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createConversation,
  listConversations,
  getConversation,
  updateConversationTitle,
  deleteConversation,
  togglePinConversation,
  archiveConversation,
  unarchiveConversation,
  listArchivedConversations,
  addMessage,
  getMessages,
  getActiveSubscription,
  getOrCreateCredits,
  getUsageStats,
  getUsageLogs,
  getMonthConversationCount,
  getTodayMessageCount,
  resetCreditsIfNeeded,
  recordMessageSent,
  recordConversationStarted,
  getRecentActivity,
  searchConversations,
  getTodayImageCount,
  getTodayDocCount,
} from "./db";
import { PLANS } from "./products";
import { invokeLLM } from "./_core/llm";
import type { Message as LLMMessage } from "./_core/llm";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";
import { buildSystemPrompt } from "./agentIdentity";
import { getAgentIdentity } from "./agentIdentityLoader";

// Helper: resolve user's plan from subscription (same logic as streamRoute)
async function getUserPlan(userId: number) {
  const sub = await getActiveSubscription(userId);
  if (!sub || !sub.stripePriceId) {
    return PLANS.find((p) => p.id === "free")!;
  }
  const creds = await getOrCreateCredits(userId, "free");
  if (creds && creds.planId !== "free") {
    const plan = PLANS.find((p) => p.id === creds.planId);
    if (plan) return plan;
  }
  return PLANS.find((p) => p.id === "starter")!;
}

// Dynamic system prompt — uses the same pipeline as streamRoute.ts
// This ensures the tRPC chat path uses the same identity, tone, and rules
// as the streaming path, and respects admin-configured identity.
const TECHNICAL_CAPABILITIES_TRPC = `## Capacidades Técnicas
- Análise e diagnóstico de infraestrutura de TI (servidores, redes, storage)
- Segurança da informação: análise de vulnerabilidades, hardening, resposta a incidentes
- Monitoramento: interpretação de métricas do Zabbix, Prometheus, Grafana
- SIEM e detecção de ameaças: análise de alertas do Wazuh, Elastic Security
- Redes e Telecom: configuração, troubleshooting, análise de tráfego
- DevOps: CI/CD, containers, Kubernetes, automação com Ansible/Terraform
- Geração e execução de scripts (Python, Bash, PowerShell)
- Documentação técnica e relatórios de segurança`;

// Build system prompt dynamically per-request to use admin-configured identity
async function getSystemPrompt(): Promise<string> {
  const identity = await getAgentIdentity();
  return buildSystemPrompt(TECHNICAL_CAPABILITIES_TRPC, identity);
}

export const appRouter = router({
  admin: adminRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  subscription: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const sub = await getActiveSubscription(ctx.user.id);
      return {
        hasActiveSubscription: !!sub,
        subscription: sub,
        isAdmin: ctx.user.role === "admin",
      };
    }),
  }),

  account: router({
    // Get credits info
    credits: protectedProcedure.query(async ({ ctx }) => {
      const sub = await getActiveSubscription(ctx.user.id);
      // Use the credits table planId as source of truth (set by webhook on subscription)
      const creds = await getOrCreateCredits(ctx.user.id, "free");
      const effectivePlanId = creds?.planId || "free";
      const plan = PLANS.find(p => p.id === effectivePlanId) || PLANS[0];
      return {
        credits: creds,
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          features: plan.features,
          limits: plan.limits,
        },
        hasSubscription: !!sub,
        subscription: sub ? {
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        } : null,
      };
    }),

    // Get usage statistics
    usageStats: protectedProcedure.query(async ({ ctx }) => {
      return getUsageStats(ctx.user.id);
    }),

    // Get real usage data + plan limits (used by ChatPage indicator and /account)
    usage: protectedProcedure.query(async ({ ctx }) => {
      const creds = await getOrCreateCredits(ctx.user.id, "free");
      const effectivePlanId = creds?.planId || "free";
      const plan = PLANS.find(p => p.id === effectivePlanId) || PLANS[0];
      const todayMessages = await getTodayMessageCount(ctx.user.id);
      const monthConversations = await getMonthConversationCount(ctx.user.id);
      const todayImages = await getTodayImageCount(ctx.user.id);
      const todayDocs = await getTodayDocCount(ctx.user.id);
      return {
        planId: plan.id,
        planName: plan.name,
        todayMessages,
        monthConversations,
        todayImages,
        todayDocs,
        limits: {
          messagesPerDay: plan.limits.messagesPerDay,
          conversationsPerMonth: plan.limits.conversationsPerMonth,
          imagesPerDay: plan.limits.imagesPerDay,
          docsPerDay: plan.limits.docsPerDay,
        },
        isAdmin: ctx.user.role === "admin",
      };
    }),

    // Get usage history
    usageHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }))
      .query(async ({ ctx, input }) => {
        const limit = input.limit || 30;
        // Primary: usage_events (real, tamper-proof data)
        const activity = await getRecentActivity(ctx.user.id, limit);
        if (activity.length > 0) {
          return activity.map((e) => ({
            id: e.id,
            eventType: e.eventType,
            conversationId: e.conversationId,
            periodKey: e.periodKey,
            createdAt: e.createdAt,
            // Friendly descriptions
            description: e.eventType === "message_sent"
              ? "Mensagem enviada"
              : e.eventType === "conversation_started"
              ? "Nova conversa iniciada"
              : e.eventType === "plan_upgraded"
              ? "Plano atualizado"
              : e.eventType === "plan_downgraded"
              ? "Plano rebaixado para Gratuito"
              : e.eventType === "subscription_activated"
              ? "Assinatura ativada"
              : e.eventType === "subscription_canceled"
              ? "Assinatura cancelada"
              : e.eventType,
            toolName: null,
            tokensUsed: 0,
          }));
        }
        // Fallback: usage_log (legacy, may be empty if streaming failed)
        return getUsageLogs(ctx.user.id, limit);
      }),

    // Get user profile info
    profile: protectedProcedure.query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        phone: ctx.user.phone || null,
        role: ctx.user.role,
        authProvider: ctx.user.authProvider || "google",
        emailVerified: ctx.user.emailVerified ?? (ctx.user.authProvider === "google"),
        phoneVerified: ctx.user.phoneVerified ?? false,
        createdAt: ctx.user.createdAt,
      };
    }),

    // Update phone number (contact only, no OTP verification)
    updatePhone: protectedProcedure
      .input(z.object({ phone: z.string().min(10).max(20) }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const dbConn = await getDb();
        if (!dbConn) throw new Error("Database not available");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbConn
          .update(users)
          .set({ phone: input.phone, updatedAt: new Date() })
          .where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
  }),

  chat: router({
    // List all conversations for the current user
    listConversations: protectedProcedure.query(async ({ ctx }) => {
      return listConversations(ctx.user.id);
    }),

    // Create a new conversation
    // NOTE: Monthly conversation limit is checked when the FIRST message is sent,
    // not when the conversation is created. Empty conversations don't count.
    createConversation: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createConversation(ctx.user.id, input.title);
      }),

    // Get a single conversation
    getConversation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getConversation(input.id, ctx.user.id);
      }),

    // Update conversation title
    updateTitle: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await updateConversationTitle(input.id, ctx.user.id, input.title);
        return { success: true };
      }),

    // Delete a conversation
    deleteConversation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.id, ctx.user.id);
        return { success: true };
      }),

    // Toggle pin a conversation
    togglePin: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isPinned = await togglePinConversation(input.id, ctx.user.id);
        return { success: true, isPinned };
      }),

    // Archive a conversation
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await archiveConversation(input.id, ctx.user.id);
        return { success: true };
      }),

    // Unarchive a conversation
    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await unarchiveConversation(input.id, ctx.user.id);
        return { success: true };
      }),

    // List archived conversations
    listArchived: protectedProcedure.query(async ({ ctx }) => {
      return listArchivedConversations(ctx.user.id);
    }),

    // Search conversations
    search: protectedProcedure
      .input(z.object({
        query: z.string().min(1).max(200),
        includeArchived: z.boolean().optional().default(false),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return searchConversations(ctx.user.id, input.query, {
          includeArchived: input.includeArchived,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // Get messages for a conversation
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
        return getMessages(input.conversationId);
      }),

    // Send a message and get AI response (non-streaming for tRPC)
    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string().min(1).max(10000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

        // Plan limit validation
        const isAdmin = ctx.user.role === "admin";
        if (!isAdmin) {
          const plan = await getUserPlan(ctx.user.id);
          // Reset credits if needed
          await resetCreditsIfNeeded(ctx.user.id);

          // Check monthly conversation limit (only for first message in conversation)
          const monthConversations = await getMonthConversationCount(ctx.user.id);
          const existingMessages = await getMessages(input.conversationId);
          const isFirstMessage = existingMessages.filter(m => m.role === "user").length === 0;
          if (isFirstMessage && monthConversations >= plan.limits.conversationsPerMonth) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Você usou ${monthConversations} de ${plan.limits.conversationsPerMonth} conversas este mês (plano ${plan.name}). Faça upgrade para continuar.`,
            });
          }

          // Check daily message limit
          const todayMessages = await getTodayMessageCount(ctx.user.id);
          if (todayMessages >= plan.limits.messagesPerDay) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Você usou ${todayMessages} de ${plan.limits.messagesPerDay} mensagens hoje (plano ${plan.name}). Faça upgrade para continuar.`,
            });
          }
          // Note: Credits system removed from gating — daily message limit (messagesPerDay)
          // and monthly conversation limit (conversationsPerMonth) are the real gates.
          // Token usage is still recorded via updateCreditsUsage() after response.
        }

        // Record usage events BEFORE saving message (independent counters)
        await recordMessageSent(ctx.user.id, input.conversationId);
        await recordConversationStarted(ctx.user.id, input.conversationId);

        // Save user message
        const userMsg = await addMessage({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        });

        // Get conversation history for context (re-fetch after adding user message)
        const fullHistory = await getMessages(input.conversationId);

        // Build LLM messages
        const llmMessages: LLMMessage[] = [
          { role: "system", content: await getSystemPrompt() },
          ...fullHistory.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
        ];

        // Call LLM
        const result = await invokeLLM({ messages: llmMessages });

        const assistantContent =
          typeof result.choices[0]?.message?.content === "string"
            ? result.choices[0].message.content
            : "Desculpe, não consegui processar sua solicitação.";

        // Save assistant message
        const assistantMsg = await addMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: assistantContent,
          tokenCount: result.usage?.total_tokens,
        });

        // Auto-title on first message
        if (fullHistory.length <= 2) {
          try {
            const titleResult = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content:
                    "Gere um título curto (máximo 40 caracteres) para esta conversa baseado na primeira mensagem do usuário. Responda APENAS com o título, sem aspas ou explicações.",
                },
                { role: "user", content: input.content },
              ],
            });
            const title =
              typeof titleResult.choices[0]?.message?.content === "string"
                ? titleResult.choices[0].message.content.slice(0, 60)
                : "Nova conversa";
            await updateConversationTitle(
              input.conversationId,
              ctx.user.id,
              title
            );
          } catch {
            // Title generation is non-critical
          }
        }

        return {
          userMessage: userMsg,
          assistantMessage: assistantMsg,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
