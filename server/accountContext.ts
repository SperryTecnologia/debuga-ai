/**
 * Account Context Builder
 * 
 * Builds a concise [ACCOUNT_CONTEXT] block to inject into the system prompt.
 * This allows the LLM to answer questions about the user's plan, usage, and limits
 * without needing a tool call.
 * 
 * Source of truth:
 * - credits table → planId (authoritative, updated by Stripe webhook)
 * - usage_events table → messages today, conversations this month
 * - capabilityLimits.ts → in-memory daily usage (images, diagrams, videos)
 * - products.ts → plan definitions and limits
 * 
 * Security:
 * - Never exposes: cost in USD, tokens, provider names, API keys, internal IDs
 * - Only exposes: plan name, usage counts, limits, feature availability
 */

import { getOrCreateCredits, getTodayMessageCount, getMonthConversationCount, getActiveSubscription } from "./db";
import { getUserUsageSummary, getPlanCapabilities } from "./capabilityLimits";
import { PLANS, type Plan } from "./products";

export interface AccountContext {
  planId: string;
  planName: string;
  messagesUsedToday: number;
  messagesLimitDaily: number;
  conversationsUsedMonth: number;
  conversationsLimitMonth: number;
  imagesUsedToday: number;
  imagesLimitDaily: number;
  diagramsUsedToday: number;
  diagramsLimitDaily: number;
  videoEnabled: boolean;
  audioTranscriptionEnabled: boolean;
  webResearchEnabled: boolean;
  imageGenerationEnabled: boolean;
  diagramGenerationEnabled: boolean;
  documentAnalysisEnabled: boolean;
  humanSupportIncluded: boolean;
  whiteLabelIncluded: boolean;
  subscriptionStatus: string;
  renewalDate: string | null;
  resetDaily: string;
  resetMonthly: string;
}

/**
 * Build account context for a given user.
 * Uses the same source of truth as billing/capability checks.
 * Non-blocking: returns a fallback context if any query fails.
 */
export async function buildAccountContext(userId: number): Promise<AccountContext> {
  try {
    // 1. Get plan from credits table (source of truth)
    const creds = await getOrCreateCredits(userId, "free");
    let plan: Plan = PLANS.find((p) => p.id === "free")!;
    if (creds && creds.planId !== "free") {
      const foundPlan = PLANS.find((p) => p.id === creds.planId);
      if (foundPlan) plan = foundPlan;
    }

    // 2. Get usage from database (authoritative counters)
    const todayMessages = await getTodayMessageCount(userId);
    const monthConversations = await getMonthConversationCount(userId);

    // 3. Get in-memory daily usage for images/diagrams/videos
    const usageSummary = getUserUsageSummary(userId, plan.id);

    // 4. Get plan capabilities for feature flags
    const capabilities = getPlanCapabilities(plan.id);

    // 5. Get subscription info
    const subscription = await getActiveSubscription(userId);

    // 6. Calculate reset times
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      planId: plan.id,
      planName: plan.name,
      messagesUsedToday: todayMessages,
      messagesLimitDaily: plan.limits.messagesPerDay,
      conversationsUsedMonth: monthConversations,
      conversationsLimitMonth: plan.limits.conversationsPerMonth,
      imagesUsedToday: usageSummary.limits.images.used,
      imagesLimitDaily: plan.limits.imagesPerDay,
      diagramsUsedToday: usageSummary.limits.diagrams.used,
      diagramsLimitDaily: capabilities.maxDiagramsPerDay,
      videoEnabled: capabilities.features.videoGeneration,
      audioTranscriptionEnabled: capabilities.features.audioTranscription,
      webResearchEnabled: capabilities.features.webResearch,
      imageGenerationEnabled: capabilities.features.imageGeneration,
      diagramGenerationEnabled: capabilities.features.diagramGeneration,
      documentAnalysisEnabled: capabilities.features.documentAnalysis,
      humanSupportIncluded: capabilities.features.prioritySupport,
      whiteLabelIncluded: plan.id === "enterprise",
      subscriptionStatus: subscription ? subscription.status : "sem_assinatura",
      renewalDate: subscription?.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
        : null,
      resetDaily: endOfDay.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      resetMonthly: endOfMonth.toLocaleDateString("pt-BR"),
    };
  } catch (error: any) {
    console.warn(`[AccountContext] Failed to build context for userId=${userId}: ${error.message}`);
    // Return safe fallback — LLM will say "não consegui consultar"
    return {
      planId: "unknown",
      planName: "Não disponível",
      messagesUsedToday: 0,
      messagesLimitDaily: 0,
      conversationsUsedMonth: 0,
      conversationsLimitMonth: 0,
      imagesUsedToday: 0,
      imagesLimitDaily: 0,
      diagramsUsedToday: 0,
      diagramsLimitDaily: 0,
      videoEnabled: false,
      audioTranscriptionEnabled: false,
      webResearchEnabled: false,
      imageGenerationEnabled: false,
      diagramGenerationEnabled: false,
      documentAnalysisEnabled: false,
      humanSupportIncluded: false,
      whiteLabelIncluded: false,
      subscriptionStatus: "indisponível",
      renewalDate: null,
      resetDaily: "meia-noite",
      resetMonthly: "primeiro dia do mês",
    };
  }
}

/**
 * Format account context as a string block for injection into the system prompt.
 * Concise format to minimize token usage.
 */
export function formatAccountContextBlock(ctx: AccountContext): string {
  const msgLimit = ctx.messagesLimitDaily >= 999999 ? "Ilimitado" : `${ctx.messagesUsedToday}/${ctx.messagesLimitDaily}`;
  const convLimit = ctx.conversationsLimitMonth >= 999999 ? "Ilimitado" : `${ctx.conversationsUsedMonth}/${ctx.conversationsLimitMonth}`;
  const imgLimit = ctx.imagesLimitDaily >= 999999 ? "Ilimitado" : `${ctx.imagesUsedToday}/${ctx.imagesLimitDaily}`;
  const diagLimit = ctx.diagramsLimitDaily >= 999999 ? "Ilimitado" : `${ctx.diagramsUsedToday}/${ctx.diagramsLimitDaily}`;

  const features: string[] = [];
  if (ctx.imageGenerationEnabled) features.push("Geração de imagens");
  if (ctx.diagramGenerationEnabled) features.push("Diagramas");
  if (ctx.documentAnalysisEnabled) features.push("Análise de documentos");
  if (ctx.audioTranscriptionEnabled) features.push("Transcrição de áudio");
  if (ctx.webResearchEnabled) features.push("Pesquisa web");
  if (ctx.videoEnabled) features.push("Geração de vídeo");
  if (ctx.humanSupportIncluded) features.push("Suporte humano prioritário");
  if (ctx.whiteLabelIncluded) features.push("White label");

  const notIncluded: string[] = [];
  if (!ctx.videoEnabled) notIncluded.push("Geração de vídeo");
  if (!ctx.audioTranscriptionEnabled) notIncluded.push("Transcrição de áudio");
  if (!ctx.webResearchEnabled) notIncluded.push("Pesquisa web");
  if (!ctx.humanSupportIncluded) notIncluded.push("Suporte humano prioritário");
  if (!ctx.whiteLabelIncluded) notIncluded.push("White label");

  let block = `\n[ACCOUNT_CONTEXT]\n`;
  block += `Usuário autenticado: sim\n`;
  block += `Plano atual: ${ctx.planName} (${ctx.planId})\n`;
  block += `Mensagens hoje: ${msgLimit}\n`;
  block += `Conversas no mês: ${convLimit}\n`;
  block += `Imagens hoje: ${imgLimit}\n`;
  block += `Diagramas hoje: ${diagLimit}\n`;
  if (features.length > 0) block += `Recursos incluídos: ${features.join(", ")}\n`;
  if (notIncluded.length > 0) block += `Recursos NÃO incluídos: ${notIncluded.join(", ")}\n`;
  block += `Assinatura: ${ctx.subscriptionStatus}\n`;
  if (ctx.renewalDate) block += `Renovação: ${ctx.renewalDate}\n`;
  block += `Reset diário: meia-noite (horário de Brasília)\n`;
  block += `Reset mensal: ${ctx.resetMonthly}\n`;
  block += `[/ACCOUNT_CONTEXT]\n`;

  return block;
}
