import { eq, desc, and, asc, sql, gte, lte, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, messages, subscriptions, credits, usageLog, usageEvents, type InsertConversation, type InsertMessage, type InsertSubscription, type InsertCredits, type InsertUsageLog, type InsertUsageEvent } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── Conversations ──

export async function createConversation(userId: number, title?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertConversation = { userId, title: title || "Nova conversa" };
  const result = await db.insert(conversations).values(values);
  const insertId = result[0].insertId;

  const rows = await db.select().from(conversations).where(eq(conversations.id, insertId)).limit(1);
  return rows[0];
}

export async function listConversations(userId: number, includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(conversations.userId, userId)];
  if (!includeArchived) {
    conditions.push(eq(conversations.isArchived, false));
  }

  return db
    .select()
    .from(conversations)
    .where(and(...conditions))
    .orderBy(desc(conversations.isPinned), desc(conversations.updatedAt));
}

export async function getConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1);

  return rows[0] || null;
}

export async function updateConversationTitle(id: number, userId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(conversations)
    .set({ title })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function deleteConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function togglePinConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conv = await getConversation(id, userId);
  if (!conv) throw new Error("Conversation not found");

  const newPinned = !conv.isPinned;
  await db
    .update(conversations)
    .set({ isPinned: newPinned })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return newPinned;
}

export async function archiveConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(conversations)
    .set({ isArchived: true, isPinned: false })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function unarchiveConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(conversations)
    .set({ isArchived: false })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function listArchivedConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.isArchived, true)))
    .orderBy(desc(conversations.updatedAt));
}

// ── Messages ──

export async function addMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values(data);
  const insertId = result[0].insertId;

  // Touch conversation updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, data.conversationId));

  const rows = await db.select().from(messages).where(eq(messages.id, insertId)).limit(1);
  return rows[0];
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

// ── Subscriptions ──

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
  return rows[0] || null;
}

export async function upsertSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values(data).onDuplicateKeyUpdate({
    set: {
      stripePriceId: data.stripePriceId,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    },
  });
}

export async function getActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Return subscription if active, trialing, or past_due (still has access)
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "trialing", "past_due"])
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return rows[0] || null;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  return rows[0] || null;
}

export async function updateSubscriptionStatus(stripeSubscriptionId: string, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set({ status }).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

// ── Credits ──

export async function getOrCreateCredits(userId: number, planId = "free") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  if (rows[0]) return rows[0];

  // Create default credits based on plan
  const planCredits: Record<string, number> = {
    free: 50,
    starter: 1000,
    pro: 10000,
    enterprise: 100000,
  };

  const totalCredits = planCredits[planId] || 50;
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);

  await db.insert(credits).values({
    userId,
    totalCredits,
    usedCredits: 0,
    planId,
    resetAt: nextMonth,
  });

  const newRows = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  return newRows[0];
}

export async function updateCreditsUsage(userId: number, tokensUsed: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(credits)
    .set({ usedCredits: sql`${credits.usedCredits} + ${tokensUsed}` })
    .where(eq(credits.userId, userId));
}

/**
 * Check if credits need to be reset (monthly cycle).
 * If resetAt has passed, reset usedCredits to 0 and set next resetAt.
 * Returns the (possibly updated) credits row.
 */
export async function resetCreditsIfNeeded(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const rows = await db.select().from(credits).where(
    and(
      eq(credits.userId, userId),
      lte(credits.resetAt, now)
    )
  ).limit(1);

  if (rows[0]) {
    // Reset credits and set next reset date
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await db
      .update(credits)
      .set({ usedCredits: 0, resetAt: nextMonth })
      .where(eq(credits.userId, userId));
  }
}

export async function updateCreditsPlan(userId: number, planId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const planCredits: Record<string, number> = {
    free: 50,
    starter: 1000,
    pro: 10000,
    enterprise: 100000,
  };

  const totalCredits = planCredits[planId] || 50;
  await db
    .update(credits)
    .set({ planId, totalCredits, usedCredits: 0 })
    .where(eq(credits.userId, userId));
}

// ── Usage Counters (Independent - cannot be bypassed by deleting chats) ──

/**
 * Get today's message count from usage_events table.
 * This is independent of whether messages/conversations still exist.
 */
export async function getTodayMessageCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  const periodKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "message_sent"),
        eq(usageEvents.periodKey, periodKey)
      )
    );

  return Number(result[0]?.count || 0);
}

/**
 * Get this month's conversation count from usage_events table.
 * Only counts conversations where at least one message was sent.
 * Independent of whether conversations still exist.
 */
export async function getMonthConversationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "conversation_started"),
        eq(usageEvents.periodKey, periodKey)
      )
    );

  return Number(result[0]?.count || 0);
}

/**
 * Record a "message_sent" usage event. Called every time a user sends a message.
 */
export async function recordMessageSent(userId: number, conversationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  const periodKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  await db.insert(usageEvents).values({
    userId,
    eventType: "message_sent",
    conversationId,
    periodKey,
  });
}

/**
 * Record a "conversation_started" usage event.
 * Called when the FIRST message is sent in a conversation.
 * Checks if this conversation was already counted to avoid double-counting.
 */
export async function recordConversationStarted(userId: number, conversationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Check if this conversation was already recorded
  const existing = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "conversation_started"),
        eq(usageEvents.conversationId, conversationId)
      )
    );

  if (Number(existing[0]?.count || 0) === 0) {
    await db.insert(usageEvents).values({
      userId,
      eventType: "conversation_started",
      conversationId,
      periodKey,
    });
  }
}

/**
 * Check if a conversation has any messages recorded in usage_events.
 * Used to determine if creating a conversation consumed a limit slot.
 */
export async function hasConversationMessages(userId: number, conversationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "conversation_started"),
        eq(usageEvents.conversationId, conversationId)
      )
    );

  return Number(result[0]?.count || 0) > 0;
}

// ── Usage Log ──

export async function addUsageLog(data: InsertUsageLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(usageLog).values(data);
}

export async function getUsageLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(usageLog)
    .where(eq(usageLog.userId, userId))
    .orderBy(desc(usageLog.createdAt))
    .limit(limit);
}

/**
 * Get recent activity from usage_events table.
 * Returns real usage data that cannot be manipulated by deleting conversations.
 * Includes: messages sent, conversations started, and account events (plan changes, etc.)
 */
export async function getRecentActivity(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const events = await db
    .select()
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId))
    .orderBy(desc(usageEvents.createdAt))
    .limit(limit);

  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    conversationId: e.conversationId,
    periodKey: e.periodKey,
    createdAt: e.createdAt,
  }));
}

/**
 * Record an account-level event (plan change, subscription activated/canceled, etc.)
 * These events appear in the user's activity history.
 */
export async function recordAccountEvent(
  userId: number,
  eventType: string,
  description?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await db.insert(usageEvents).values({
    userId,
    eventType,
    periodKey,
    conversationId: null,
  });

  // Also log in usage_log for richer description
  await db.insert(usageLog).values({
    userId,
    tokensUsed: 0,
    description: description || eventType,
  });
}

export async function getUsageStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Total tokens used (from usage_log - not affected by deletion)
  const totalResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${usageLog.tokensUsed}), 0)` })
    .from(usageLog)
    .where(eq(usageLog.userId, userId));

  // Today's tokens
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${usageLog.tokensUsed}), 0)` })
    .from(usageLog)
    .where(and(eq(usageLog.userId, userId), gte(usageLog.createdAt, today)));

  // Real usage from independent counters (usage_events)
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Total conversations this month (from usage_events)
  const monthConvResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "conversation_started"),
        eq(usageEvents.periodKey, monthKey)
      )
    );

  // Total messages today (from usage_events)
  const todayMsgResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "message_sent"),
        eq(usageEvents.periodKey, dayKey)
      )
    );

  // Total messages all time (from usage_events)
  const totalMsgResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "message_sent")
      )
    );

  return {
    totalTokens: Number(totalResult[0]?.total || 0),
    todayTokens: Number(todayResult[0]?.total || 0),
    totalConversations: Number(monthConvResult[0]?.count || 0),
    totalMessages: Number(totalMsgResult[0]?.count || 0),
    todayMessages: Number(todayMsgResult[0]?.count || 0),
    monthConversations: Number(monthConvResult[0]?.count || 0),
  };
}


export async function searchConversations(
  userId: number,
  query: string,
  options: { includeArchived?: boolean; limit?: number; offset?: number } = {}
): Promise<{
  results: Array<{
    conversationId: number;
    title: string;
    isArchived: boolean;
    matchType: "title" | "message";
    snippet: string | null;
    messageRole: string | null;
    updatedAt: Date;
  }>;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { results: [], total: 0 };

  const { includeArchived = false, limit = 20, offset = 0 } = options;
  const searchPattern = `%${query}%`;

  // Search in conversation titles
  const titleConditions = [
    eq(conversations.userId, userId),
    like(conversations.title, searchPattern),
  ];
  if (!includeArchived) {
    titleConditions.push(eq(conversations.isArchived, false));
  }

  const titleResults = await db
    .select({
      conversationId: conversations.id,
      title: conversations.title,
      isArchived: conversations.isArchived,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(and(...titleConditions))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);

  // Search in messages content
  const messageConditions = [
    eq(conversations.userId, userId),
    like(messages.content, searchPattern),
  ];
  if (!includeArchived) {
    messageConditions.push(eq(conversations.isArchived, false));
  }

  const messageResults = await db
    .select({
      conversationId: conversations.id,
      title: conversations.title,
      isArchived: conversations.isArchived,
      updatedAt: conversations.updatedAt,
      messageContent: messages.content,
      messageRole: messages.role,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...messageConditions))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit * 2); // get more to deduplicate

  // Deduplicate and merge results
  const seen = new Set<number>();
  const results: Array<{
    conversationId: number;
    title: string;
    isArchived: boolean;
    matchType: "title" | "message";
    snippet: string | null;
    messageRole: string | null;
    updatedAt: Date;
  }> = [];

  // Title matches first
  for (const r of titleResults) {
    if (!seen.has(r.conversationId)) {
      seen.add(r.conversationId);
      results.push({
        conversationId: r.conversationId,
        title: r.title,
        isArchived: r.isArchived,
        matchType: "title",
        snippet: null,
        messageRole: null,
        updatedAt: r.updatedAt,
      });
    }
  }

  // Message matches
  for (const r of messageResults) {
    if (!seen.has(r.conversationId)) {
      seen.add(r.conversationId);
      // Extract snippet around the match
      const content = r.messageContent || "";
      const lowerContent = content.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const matchIndex = lowerContent.indexOf(lowerQuery);
      let snippet = "";
      if (matchIndex >= 0) {
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(content.length, matchIndex + query.length + 60);
        snippet = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
      } else {
        snippet = content.slice(0, 100) + (content.length > 100 ? "..." : "");
      }

      results.push({
        conversationId: r.conversationId,
        title: r.title,
        isArchived: r.isArchived,
        matchType: "message",
        snippet,
        messageRole: r.messageRole,
        updatedAt: r.updatedAt,
      });
    }
  }

  // Sort by updatedAt desc and paginate
  results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const paginated = results.slice(offset, offset + limit);

  return { results: paginated, total: results.length };
}
