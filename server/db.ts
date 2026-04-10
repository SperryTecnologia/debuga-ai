import { eq, desc, and, asc, sql, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, messages, subscriptions, credits, usageLog, type InsertConversation, type InsertMessage, type InsertSubscription, type InsertCredits, type InsertUsageLog } from "../drizzle/schema";
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
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
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

export async function getUsageStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Total tokens used
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

  // Total conversations
  const convResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(conversations)
    .where(eq(conversations.userId, userId));

  // Total messages
  const msgResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(
      sql`${messages.conversationId} IN (SELECT id FROM conversations WHERE userId = ${userId})`
    );

  return {
    totalTokens: Number(totalResult[0]?.total || 0),
    todayTokens: Number(todayResult[0]?.total || 0),
    totalConversations: Number(convResult[0]?.count || 0),
    totalMessages: Number(msgResult[0]?.count || 0),
  };
}
