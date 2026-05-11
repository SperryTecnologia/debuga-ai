import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
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
} from "./db";
import { PLANS } from "./products";
import { invokeLLM } from "./_core/llm";
import type { Message as LLMMessage } from "./_core/llm";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

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

const SYSTEM_PROMPT = `Você é o **debuga.ai**, um agente autônomo especializado em Infraestrutura de TI, Segurança da Informação, DevOps e Telecomunicações. Você foi desenvolvido pela Sperry Tecnologia.

## Suas Capacidades:
- Análise e diagnóstico de infraestrutura de TI (servidores, redes, storage)
- Segurança da informação: análise de vulnerabilidades, hardening, resposta a incidentes
- Monitoramento: interpretação de métricas do Zabbix, Prometheus, Grafana
- SIEM e detecção de ameaças: análise de alertas do Wazuh, Elastic Security
- Redes e Telecom: configuração, troubleshooting, análise de tráfego
- DevOps: CI/CD, containers, Kubernetes, automação com Ansible/Terraform
- Geração e execução de scripts (Python, Bash, PowerShell)
- Documentação técnica e relatórios de segurança

## Diretrizes:
1. Sempre responda em português brasileiro
2. Seja técnico e preciso, mas acessível
3. Quando possível, forneça comandos, scripts ou configurações prontas para uso
4. Use formatação Markdown com syntax highlighting para código
5. Indique riscos e boas práticas de segurança
6. Quando não souber algo, seja honesto e sugira fontes confiáveis
7. Estruture respostas longas com títulos e seções claras

## Formato de Resposta:
- Use \`\`\`linguagem para blocos de código
- Use **negrito** para termos importantes
- Use tabelas quando comparar opções
- Inclua avisos de segurança quando relevante com ⚠️`;

export const appRouter = router({
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
      return {
        planId: plan.id,
        planName: plan.name,
        todayMessages,
        monthConversations,
        limits: {
          messagesPerDay: plan.limits.messagesPerDay,
          conversationsPerMonth: plan.limits.conversationsPerMonth,
        },
        isAdmin: ctx.user.role === "admin",
      };
    }),

    // Get usage history
    usageHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }))
      .query(async ({ ctx, input }) => {
        return getUsageLogs(ctx.user.id, input.limit || 50);
      }),

    // Get user profile info
    profile: protectedProcedure.query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
        createdAt: ctx.user.createdAt,
      };
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

    // Get messages for a conversation
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) throw new Error("Conversation not found");
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
              message: `Você atingiu o limite de ${plan.limits.conversationsPerMonth} conversas por mês do plano ${plan.name}. Faça upgrade para continuar.`,
            });
          }

          // Check daily message limit
          const todayMessages = await getTodayMessageCount(ctx.user.id);
          if (todayMessages >= plan.limits.messagesPerDay) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Você atingiu o limite de ${plan.limits.messagesPerDay} mensagens por dia do plano ${plan.name}. Faça upgrade para continuar.`,
            });
          }
          // Check credits
          const creds = await getOrCreateCredits(ctx.user.id, plan.id);
          if (creds && creds.usedCredits >= creds.totalCredits && plan.id === "free") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Seus créditos gratuitos acabaram. Assine um plano para continuar usando o debuga.ai.",
            });
          }
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
          { role: "system", content: SYSTEM_PROMPT },
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
