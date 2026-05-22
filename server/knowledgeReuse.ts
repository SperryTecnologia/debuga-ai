/**
 * Knowledge Reuse Module for debuga.ai
 *
 * Implements RAG-style (Retrieval-Augmented Generation) knowledge retrieval:
 *   1. Takes user message as input
 *   2. Searches knowledge_base for relevant items using keyword matching + tag matching
 *   3. Returns matched items to be injected into the system prompt
 *   4. Tracks which items were used for observability
 *
 * Note: This uses keyword/tag-based retrieval (not vector embeddings).
 * For production scale, consider adding pgvector for semantic search.
 */

import { getDb } from "./db";
import { knowledgeBase, aiInstructions } from "../drizzle/schema";
import { eq, sql, desc } from "drizzle-orm";

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type KnowledgeMatch = {
  id: number;
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  relevanceScore: number; // 0-1
  matchType: "keyword" | "tag" | "category" | "exact";
};

export type KnowledgeContext = {
  items: KnowledgeMatch[];
  totalMatched: number;
  injectedTokenEstimate: number;
  source: string; // "knowledge_base" | "instructions" | "both"
};

// ══════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════

const KNOWLEDGE_CONFIG = {
  // Maximum items to inject into context
  maxItemsToInject: 5,
  // Maximum tokens to inject (rough estimate: 1 token ≈ 4 chars)
  maxTokensToInject: 2000,
  // Minimum relevance score to include
  minRelevanceScore: 0.2,
  // Weight for different match types
  weights: {
    exact: 1.0,
    tag: 0.8,
    keyword: 0.5,
    category: 0.3,
  },
};

// ══════════════════════════════════════════════════════════════
// Utility Functions
// ══════════════════════════════════════════════════════════════

/**
 * Extract keywords from a message for matching.
 * Removes stop words and returns meaningful terms.
 */
function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    "a", "o", "e", "de", "da", "do", "em", "um", "uma", "para", "com",
    "não", "que", "se", "na", "no", "por", "mais", "as", "os", "como",
    "mas", "foi", "ao", "ele", "das", "tem", "à", "seu", "sua", "ou",
    "ser", "quando", "muito", "há", "nos", "já", "está", "eu", "também",
    "só", "pelo", "pela", "até", "isso", "ela", "entre", "era", "depois",
    "sem", "mesmo", "aos", "ter", "seus", "quem", "nas", "me", "esse",
    "eles", "estão", "você", "tinha", "foram", "essa", "num", "nem",
    "suas", "meu", "às", "minha", "têm", "numa", "pelos", "elas",
    "havia", "seja", "qual", "será", "nós", "tenho", "lhe", "deles",
    "essas", "esses", "pelas", "este", "fosse", "dele",
    // English stop words
    "the", "is", "at", "which", "on", "a", "an", "and", "or", "but",
    "in", "with", "to", "for", "of", "not", "no", "can", "had", "have",
    "was", "were", "are", "been", "being", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "must",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
    "us", "them", "my", "your", "his", "its", "our", "their",
    "this", "that", "these", "those", "what", "how", "why", "when", "where",
  ]);

  return message
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 20); // limit to 20 keywords
}

/**
 * Calculate relevance score between a message and a knowledge item.
 */
function calculateRelevance(keywords: string[], item: {
  title: string;
  content: string;
  tags: string | null;
  category: string | null;
}): { score: number; matchType: "exact" | "tag" | "keyword" | "category" } {
  const titleLower = item.title.toLowerCase();
  const contentLower = item.content.toLowerCase();
  const tagsLower = (item.tags || "").toLowerCase();

  let maxScore = 0;
  let bestMatchType: "exact" | "tag" | "keyword" | "category" = "keyword";

  // Check for exact phrase match in title
  const fullQuery = keywords.join(" ");
  if (titleLower.includes(fullQuery) && fullQuery.length > 5) {
    maxScore = KNOWLEDGE_CONFIG.weights.exact;
    bestMatchType = "exact";
  }

  // Check tag matches
  if (tagsLower) {
    const tags = tagsLower.split(",").map(t => t.trim());
    const tagMatches = keywords.filter(kw => tags.some(tag => tag.includes(kw) || kw.includes(tag)));
    const tagScore = (tagMatches.length / Math.max(keywords.length, 1)) * KNOWLEDGE_CONFIG.weights.tag;
    if (tagScore > maxScore) {
      maxScore = tagScore;
      bestMatchType = "tag";
    }
  }

  // Check keyword matches in content
  const keywordMatches = keywords.filter(kw => contentLower.includes(kw) || titleLower.includes(kw));
  const keywordScore = (keywordMatches.length / Math.max(keywords.length, 1)) * KNOWLEDGE_CONFIG.weights.keyword;
  if (keywordScore > maxScore) {
    maxScore = keywordScore;
    bestMatchType = "keyword";
  }

  // Category bonus
  if (item.category) {
    const categoryLower = item.category.toLowerCase();
    const categoryMatch = keywords.some(kw => categoryLower.includes(kw));
    if (categoryMatch && maxScore < KNOWLEDGE_CONFIG.weights.category) {
      maxScore = KNOWLEDGE_CONFIG.weights.category;
      bestMatchType = "category";
    }
  }

  return { score: maxScore, matchType: bestMatchType };
}

/**
 * Estimate token count for a string (rough: 1 token ≈ 4 chars for Portuguese).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ══════════════════════════════════════════════════════════════
// Core Functions
// ══════════════════════════════════════════════════════════════

/**
 * Search knowledge base for items relevant to the user's message.
 * Returns matched items sorted by relevance.
 */
export async function searchKnowledge(userMessage: string): Promise<KnowledgeContext> {
  try {
    // Check if knowledge reuse is enabled
    if (process.env.ENABLE_KNOWLEDGE_REUSE !== "true") {
      return { items: [], totalMatched: 0, injectedTokenEstimate: 0, source: "none" };
    }

    const keywords = extractKeywords(userMessage);
    if (keywords.length === 0) {
      return { items: [], totalMatched: 0, injectedTokenEstimate: 0, source: "none" };
    }

    const db = await getDb();
    if (!db) return { items: [], totalMatched: 0, injectedTokenEstimate: 0, source: "none" };

    // Fetch all active knowledge items (for small KBs this is fine; for large KBs use pg_trgm)
    const allItems = await db.select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, true))
      .limit(500); // safety limit

    // Score each item
    const scored: KnowledgeMatch[] = allItems
      .map(item => {
        const { score, matchType } = calculateRelevance(keywords, item);
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          category: item.category,
          tags: item.tags,
          relevanceScore: score,
          matchType,
        };
      })
      .filter(item => item.relevanceScore >= KNOWLEDGE_CONFIG.minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit by max items and max tokens
    const selected: KnowledgeMatch[] = [];
    let totalTokens = 0;

    for (const item of scored) {
      if (selected.length >= KNOWLEDGE_CONFIG.maxItemsToInject) break;

      const itemTokens = estimateTokens(item.content);
      if (totalTokens + itemTokens > KNOWLEDGE_CONFIG.maxTokensToInject) break;

      selected.push(item);
      totalTokens += itemTokens;
    }

    return {
      items: selected,
      totalMatched: scored.length,
      injectedTokenEstimate: totalTokens,
      source: "knowledge_base",
    };
  } catch (err) {
    console.error("[KnowledgeReuse] searchKnowledge failed:", err);
    return { items: [], totalMatched: 0, injectedTokenEstimate: 0, source: "error" };
  }
}

/**
 * Get active AI instructions for the system prompt.
 * These are always injected (not conditional on user message).
 */
export async function getActiveInstructions(): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const instructions = await db.select()
      .from(aiInstructions)
      .where(eq(aiInstructions.isActive, true))
      .orderBy(desc(aiInstructions.priority));

    return instructions.map(i => i.content);
  } catch (err) {
    console.error("[KnowledgeReuse] getActiveInstructions failed:", err);
    return [];
  }
}

/**
 * Build the augmented system prompt with knowledge context.
 * Injects relevant KB items and instructions into the base system prompt.
 */
export function buildAugmentedPrompt(
  baseSystemPrompt: string,
  knowledgeContext: KnowledgeContext,
  instructions: string[]
): string {
  const parts: string[] = [baseSystemPrompt];

  // Add instructions
  if (instructions.length > 0) {
    parts.push("\n\n--- INSTRUÇÕES DE COMPORTAMENTO ---");
    instructions.forEach((inst, i) => {
      parts.push(`\n${i + 1}. ${inst}`);
    });
  }

  // Add knowledge context
  if (knowledgeContext.items.length > 0) {
    parts.push("\n\n--- CONTEXTO DA BASE DE CONHECIMENTO ---");
    parts.push("Use as informações abaixo para responder com precisão:");
    knowledgeContext.items.forEach((item, i) => {
      parts.push(`\n[${i + 1}] ${item.title}:`);
      parts.push(item.content);
    });
    parts.push("\n--- FIM DO CONTEXTO ---");
  }

  return parts.join("\n");
}

/**
 * Get knowledge reuse statistics for admin dashboard.
 */
export async function getKnowledgeStats(): Promise<{
  totalItems: number;
  activeItems: number;
  categoryCounts: Record<string, number>;
  averageContentLength: number;
}> {
  try {
    const db = await getDb();
    if (!db) return { totalItems: 0, activeItems: 0, categoryCounts: {}, averageContentLength: 0 };

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(knowledgeBase);

    const [activeResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, true));

    const categories = await db.select({
      category: knowledgeBase.category,
      count: sql<number>`count(*)::int`,
    })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, true))
      .groupBy(knowledgeBase.category);

    const [avgLength] = await db.select({
      avg: sql<number>`avg(length(${knowledgeBase.content}))`,
    }).from(knowledgeBase).where(eq(knowledgeBase.isActive, true));

    const categoryCounts: Record<string, number> = {};
    categories.forEach(c => {
      categoryCounts[c.category || "sem_categoria"] = Number(c.count);
    });

    return {
      totalItems: Number(totalResult?.count ?? 0),
      activeItems: Number(activeResult?.count ?? 0),
      categoryCounts,
      averageContentLength: Math.round(Number(avgLength?.avg ?? 0)),
    };
  } catch (err) {
    console.error("[KnowledgeReuse] getKnowledgeStats failed:", err);
    return { totalItems: 0, activeItems: 0, categoryCounts: {}, averageContentLength: 0 };
  }
}
