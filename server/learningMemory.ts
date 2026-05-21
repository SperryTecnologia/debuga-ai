/**
 * Learning & Memory Module for debuga.ai — Expanded
 *
 * Responsibilities:
 *   1. Save every interaction (user message + assistant response) for analysis
 *   2. Track capability usage per user/tenant for cost allocation
 *   3. Detect patterns that could become knowledge base items
 *   4. Generate KB suggestions from repeated questions or high-quality answers
 *   5. Track user feedback (thumbs up/down) for quality improvement
 *   6. Provider performance tracking (latency, errors, quality)
 *   7. Cost accumulation and budget alerts
 *
 * This module does NOT block the response pipeline — all operations are async/fire-and-forget.
 */

import { getDb } from "./db";
import { learningInteractions, learningSuggestions } from "../drizzle/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { type TaskType } from "./intentClassifier";

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type InteractionData = {
  userId: number;
  conversationId?: number;
  messageId?: number;
  userMessage: string;
  assistantResponse?: string;
  taskType?: TaskType | string;
  providerUsed?: string;
  modelUsed?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  responseTimeMs?: number;
  knowledgeItemsMatched?: number;
  capabilityScore?: number;
  routingReason?: string;
  estimatedCost?: number;
  wasRouted?: boolean;
  fallbackUsed?: boolean;
  metadata?: Record<string, unknown>;
};

export type FeedbackData = {
  interactionId: number;
  wasHelpful: boolean;
  userFeedback?: string;
};

export type CapabilityUsageRecord = {
  userId: number;
  taskType: TaskType | string;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  success: boolean;
  responseTimeMs: number;
  timestamp: Date;
};

export type ProviderPerformanceStats = {
  provider: string;
  totalRequests: number;
  successRate: number;
  avgResponseTimeMs: number;
  avgTokensPerRequest: number;
  totalCost: number;
  errorCount: number;
  lastError?: string;
  lastUsed?: Date;
};

// ══════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════

const LEARNING_CONFIG = {
  // Minimum response quality to suggest for KB (based on length and structure)
  minResponseLengthForSuggestion: 200,
  // How many times a similar question must appear before suggesting KB entry
  similarQuestionThreshold: 3,
  // Time window for detecting repeated questions (days)
  repeatDetectionWindowDays: 30,
  // Maximum suggestions per day to avoid flooding admin
  maxSuggestionsPerDay: 10,
  // Minimum user feedback score to consider for KB
  minHelpfulRatio: 0.7,
  // Cost alert thresholds (USD)
  costAlertThresholds: {
    daily: 10.0,
    weekly: 50.0,
    monthly: 200.0,
  },
};

// In-memory cost accumulator (reset on server restart, persisted via DB)
const costAccumulator: Record<string, { daily: number; weekly: number; monthly: number; lastReset: Date }> = {};

// ══════════════════════════════════════════════════════════════
// Core Functions
// ══════════════════════════════════════════════════════════════

/**
 * Save an interaction to the learning_interactions table.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function saveInteraction(data: InteractionData): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const [result] = await db.insert(learningInteractions).values({
      userId: data.userId,
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? null,
      interactionType: "chat",
      userMessage: data.userMessage,
      assistantResponse: data.assistantResponse ?? null,
      taskType: data.taskType ?? null,
      providerUsed: data.providerUsed ?? null,
      tokensUsed: data.tokensUsed ?? 0,
      responseTimeMs: data.responseTimeMs ?? 0,
      knowledgeItemsMatched: data.knowledgeItemsMatched ?? 0,
      suggestedForKb: false,
      metadata: {
        ...(data.metadata ?? {}),
        modelUsed: data.modelUsed,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        capabilityScore: data.capabilityScore,
        routingReason: data.routingReason,
        estimatedCost: data.estimatedCost,
        wasRouted: data.wasRouted,
        fallbackUsed: data.fallbackUsed,
      },
    }).returning({ id: learningInteractions.id });

    // Track cost in memory
    if (data.estimatedCost && data.estimatedCost > 0) {
      trackCost(data.userId.toString(), data.estimatedCost);
    }

    return result?.id ?? null;
  } catch (err) {
    console.error("[LearningMemory] Failed to save interaction:", err);
    return null;
  }
}

/**
 * Record user feedback for an interaction.
 */
export async function recordFeedback(data: FeedbackData): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db.update(learningInteractions)
      .set({
        wasHelpful: data.wasHelpful,
        userFeedback: data.userFeedback ?? null,
        updatedAt: new Date(),
      })
      .where(eq(learningInteractions.id, data.interactionId));

    return true;
  } catch (err) {
    console.error("[LearningMemory] Failed to record feedback:", err);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// Cost Tracking
// ══════════════════════════════════════════════════════════════

function trackCost(userId: string, cost: number): void {
  if (!costAccumulator[userId]) {
    costAccumulator[userId] = { daily: 0, weekly: 0, monthly: 0, lastReset: new Date() };
  }

  const acc = costAccumulator[userId];
  const now = new Date();
  const hoursSinceReset = (now.getTime() - acc.lastReset.getTime()) / (1000 * 60 * 60);

  // Reset daily counter every 24h
  if (hoursSinceReset >= 24) {
    acc.daily = 0;
    if (hoursSinceReset >= 168) acc.weekly = 0; // 7 days
    if (hoursSinceReset >= 720) acc.monthly = 0; // 30 days
    acc.lastReset = now;
  }

  acc.daily += cost;
  acc.weekly += cost;
  acc.monthly += cost;

  // Log alerts
  if (acc.daily >= LEARNING_CONFIG.costAlertThresholds.daily) {
    console.warn(`[CostAlert] User ${userId} exceeded daily cost threshold: $${acc.daily.toFixed(4)}`);
  }
}

/**
 * Get current cost accumulation for a user.
 */
export function getUserCostAccumulation(userId: string): { daily: number; weekly: number; monthly: number } {
  return costAccumulator[userId] || { daily: 0, weekly: 0, monthly: 0 };
}

/**
 * Check if a user has exceeded their cost budget.
 */
export function isOverBudget(userId: string, dailyLimit?: number): boolean {
  const acc = costAccumulator[userId];
  if (!acc) return false;
  const limit = dailyLimit ?? LEARNING_CONFIG.costAlertThresholds.daily;
  return acc.daily >= limit;
}

// ══════════════════════════════════════════════════════════════
// Provider Performance Tracking
// ══════════════════════════════════════════════════════════════

// In-memory performance stats (for fast access)
const providerStats: Record<string, {
  totalRequests: number;
  successCount: number;
  totalResponseTimeMs: number;
  totalTokens: number;
  totalCost: number;
  errorCount: number;
  lastError?: string;
  lastUsed?: Date;
}> = {};

/**
 * Record a provider usage event for performance tracking.
 */
export function recordProviderUsage(record: CapabilityUsageRecord): void {
  const key = `${record.provider}:${record.model}`;
  if (!providerStats[key]) {
    providerStats[key] = {
      totalRequests: 0,
      successCount: 0,
      totalResponseTimeMs: 0,
      totalTokens: 0,
      totalCost: 0,
      errorCount: 0,
    };
  }

  const stats = providerStats[key];
  stats.totalRequests++;
  stats.totalResponseTimeMs += record.responseTimeMs;
  stats.totalTokens += record.tokensUsed;
  stats.totalCost += record.cost;
  stats.lastUsed = record.timestamp;

  if (record.success) {
    stats.successCount++;
  } else {
    stats.errorCount++;
  }
}

/**
 * Get performance stats for all providers.
 */
export function getProviderPerformanceStats(): ProviderPerformanceStats[] {
  return Object.entries(providerStats).map(([key, stats]) => {
    const [provider] = key.split(":");
    return {
      provider,
      totalRequests: stats.totalRequests,
      successRate: stats.totalRequests > 0 ? stats.successCount / stats.totalRequests : 0,
      avgResponseTimeMs: stats.totalRequests > 0 ? stats.totalResponseTimeMs / stats.totalRequests : 0,
      avgTokensPerRequest: stats.totalRequests > 0 ? stats.totalTokens / stats.totalRequests : 0,
      totalCost: stats.totalCost,
      errorCount: stats.errorCount,
      lastError: stats.lastError,
      lastUsed: stats.lastUsed,
    };
  });
}

// ══════════════════════════════════════════════════════════════
// Pattern Detection & KB Suggestions
// ══════════════════════════════════════════════════════════════

/**
 * Analyze recent interactions and generate KB suggestions.
 * Called periodically or after a batch of interactions.
 */
export async function analyzeAndSuggest(): Promise<number> {
  try {
    if (process.env.ENABLE_LEARNING !== "true") return 0;

    const db = await getDb();
    if (!db) return 0;

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - LEARNING_CONFIG.repeatDetectionWindowDays);

    // Find interactions with good responses that haven't been suggested yet
    const candidates = await db.select()
      .from(learningInteractions)
      .where(
        and(
          eq(learningInteractions.suggestedForKb, false),
          gte(learningInteractions.createdAt, windowStart),
          sql`length(${learningInteractions.assistantResponse}) >= ${LEARNING_CONFIG.minResponseLengthForSuggestion}`
        )
      )
      .orderBy(desc(learningInteractions.createdAt))
      .limit(50);

    let suggestionsCreated = 0;

    for (const candidate of candidates) {
      if (suggestionsCreated >= LEARNING_CONFIG.maxSuggestionsPerDay) break;
      if (candidate.wasHelpful === false) continue;

      const title = candidate.userMessage.substring(0, 150);
      const content = `**Pergunta frequente:**\n${candidate.userMessage}\n\n**Resposta sugerida:**\n${candidate.assistantResponse}`;

      await db.insert(learningSuggestions).values({
        tenantId: "default",
        title,
        content,
        category: candidate.taskType ?? "geral",
        origin: "chat",
        provider: candidate.providerUsed ?? "unknown",
        status: "pending",
        sourceConversationId: candidate.conversationId,
        sourceMessageId: candidate.messageId,
      });

      await db.update(learningInteractions)
        .set({ suggestedForKb: true, kbSuggestionStatus: "pending" })
        .where(eq(learningInteractions.id, candidate.id));

      suggestionsCreated++;
    }

    if (suggestionsCreated > 0) {
      console.log(`[LearningMemory] Created ${suggestionsCreated} KB suggestions from interactions`);
    }

    return suggestionsCreated;
  } catch (err) {
    console.error("[LearningMemory] analyzeAndSuggest failed:", err);
    return 0;
  }
}

// ══════════════════════════════════════════════════════════════
// Capability Usage Analytics
// ══════════════════════════════════════════════════════════════

/**
 * Get capability usage breakdown for a time period.
 */
export async function getCapabilityUsageStats(days: number = 30): Promise<Array<{
  taskType: string;
  count: number;
  avgResponseTimeMs: number;
  totalTokens: number;
  totalCost: number;
}>> {
  try {
    const db = await getDb();
    if (!db) return [];

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - days);

    const results = await db.select({
      taskType: learningInteractions.taskType,
      count: sql<number>`count(*)::int`,
      avgResponseTimeMs: sql<number>`avg(${learningInteractions.responseTimeMs})::int`,
      totalTokens: sql<number>`sum(${learningInteractions.tokensUsed})::int`,
    })
      .from(learningInteractions)
      .where(gte(learningInteractions.createdAt, windowStart))
      .groupBy(learningInteractions.taskType);

    return results.map(r => ({
      taskType: r.taskType ?? "unknown",
      count: Number(r.count),
      avgResponseTimeMs: Number(r.avgResponseTimeMs ?? 0),
      totalTokens: Number(r.totalTokens ?? 0),
      totalCost: 0, // Would need to join with cost data
    }));
  } catch (err) {
    console.error("[LearningMemory] getCapabilityUsageStats failed:", err);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// Learning Statistics
// ══════════════════════════════════════════════════════════════

/**
 * Get learning statistics for admin dashboard.
 */
export async function getLearningStats(): Promise<{
  totalInteractions: number;
  interactionsToday: number;
  pendingSuggestions: number;
  approvedSuggestions: number;
  helpfulRatio: number;
  topTaskTypes: Array<{ taskType: string; count: number }>;
  topProviders: Array<{ provider: string; count: number }>;
}> {
  try {
    const db = await getDb();
    if (!db) return {
      totalInteractions: 0, interactionsToday: 0, pendingSuggestions: 0,
      approvedSuggestions: 0, helpfulRatio: 0, topTaskTypes: [], topProviders: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(learningInteractions);

    const [todayResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(learningInteractions)
      .where(gte(learningInteractions.createdAt, today));

    const [pendingResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(learningSuggestions)
      .where(eq(learningSuggestions.status, "pending"));

    const [approvedResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(learningSuggestions)
      .where(eq(learningSuggestions.status, "approved"));

    const [helpfulResult] = await db.select({
      helpful: sql<number>`count(*) filter (where ${learningInteractions.wasHelpful} = true)`,
      total: sql<number>`count(*) filter (where ${learningInteractions.wasHelpful} is not null)`,
    }).from(learningInteractions);

    const helpfulRatio = (helpfulResult?.total ?? 0) > 0
      ? (helpfulResult?.helpful ?? 0) / (helpfulResult?.total ?? 1)
      : 0;

    // Top task types (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topTaskTypes = await db.select({
      taskType: learningInteractions.taskType,
      count: sql<number>`count(*)::int`,
    })
      .from(learningInteractions)
      .where(gte(learningInteractions.createdAt, thirtyDaysAgo))
      .groupBy(learningInteractions.taskType)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const topProviders = await db.select({
      provider: learningInteractions.providerUsed,
      count: sql<number>`count(*)::int`,
    })
      .from(learningInteractions)
      .where(gte(learningInteractions.createdAt, thirtyDaysAgo))
      .groupBy(learningInteractions.providerUsed)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      totalInteractions: Number(totalResult?.count ?? 0),
      interactionsToday: Number(todayResult?.count ?? 0),
      pendingSuggestions: Number(pendingResult?.count ?? 0),
      approvedSuggestions: Number(approvedResult?.count ?? 0),
      helpfulRatio,
      topTaskTypes: topTaskTypes.map(t => ({ taskType: t.taskType ?? "unknown", count: Number(t.count) })),
      topProviders: topProviders.map(p => ({ provider: p.provider ?? "unknown", count: Number(p.count) })),
    };
  } catch (err) {
    console.error("[LearningMemory] getLearningStats failed:", err);
    return {
      totalInteractions: 0, interactionsToday: 0, pendingSuggestions: 0,
      approvedSuggestions: 0, helpfulRatio: 0, topTaskTypes: [], topProviders: [],
    };
  }
}
