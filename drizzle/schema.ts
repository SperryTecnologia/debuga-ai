/**
 * Database schema for debuga.ai (PostgreSQL).
 * Converted from MySQL/TiDB production schema.
 * IMPORTANT: This is the canonical schema. Migrations are managed via drizzle-kit.
 */

import { boolean, integer, pgEnum, pgTable, text, timestamp, varchar, json, jsonb, serial, bigint, numeric } from "drizzle-orm/pg-core";

// ── Enums ──
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const authProviderEnum = pgEnum("auth_provider", ["google", "local"]);
export const verificationTypeEnum = pgEnum("verification_type", ["email", "phone", "password_reset"]);
export const instructionCategoryEnum = pgEnum("instruction_category", [
  "comportamento",
  "atendimento",
  "suporte_tecnico",
  "vendas",
  "restricoes",
  "encaminhamento_humano",
  "seguranca",
  "cliente_especifico",
]);

// ── Users (updated with local auth fields + verification) ──
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  passwordHash: text("passwordHash"),
  authProvider: authProviderEnum("authProvider").default("google"),
  googleOpenId: varchar("googleOpenId", { length: 64 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  tenantId: varchar("tenantId", { length: 64 }).default("default"),
  isActive: boolean("isActive").default(true).notNull(),
  // Verification fields
  emailVerified: boolean("emailVerified").default(false).notNull(),
  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  privacyAcceptedAt: timestamp("privacyAcceptedAt"),
  lastLoginAt: timestamp("lastLoginAt"),
  failedLoginAttempts: integer("failedLoginAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Conversations ──
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).default("Nova conversa").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ── Messages ──
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolCalls: json("toolCalls"),
  tokenCount: integer("tokenCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ── Subscriptions ──
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull().unique(),
  stripePriceId: varchar("stripePriceId", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: integer("cancelAtPeriodEnd").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ── Credits ──
export const credits = pgTable("credits", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  totalCredits: integer("totalCredits").notNull().default(0),
  usedCredits: integer("usedCredits").notNull().default(0),
  planId: varchar("planId", { length: 50 }).notNull().default("free"),
  resetAt: timestamp("resetAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Credits = typeof credits.$inferSelect;
export type InsertCredits = typeof credits.$inferInsert;

// ── Usage Log ──
export const usageLog = pgTable("usage_log", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  conversationId: integer("conversationId"),
  tokensUsed: integer("tokensUsed").notNull().default(0),
  toolName: varchar("toolName", { length: 100 }),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageLog = typeof usageLog.$inferSelect;
export type InsertUsageLog = typeof usageLog.$inferInsert;

// ── Usage Events ──
export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(),
  conversationId: integer("conversationId"),
  periodKey: varchar("periodKey", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageEvent = typeof usageEvents.$inferSelect;
export type InsertUsageEvent = typeof usageEvents.$inferInsert;

// ══════════════════════════════════════════════════════════════
// NEW TABLES: Admin Panel / White Label
// ══════════════════════════════════════════════════════════════

// ── App Settings (White Label configuration) ──
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).default("default").notNull().unique(),
  appName: varchar("appName", { length: 100 }).default("debuga.ai"),
  agentName: varchar("agentName", { length: 100 }).default("debuga.ai"),
  landingTitle: varchar("landingTitle", { length: 200 }),
  landingSubtitle: text("landingSubtitle"),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#22c55e"),
  logoUrl: text("logoUrl"),
  faviconUrl: text("faviconUrl"),
  supportEmail: varchar("supportEmail", { length: 320 }),
  supportWhatsapp: varchar("supportWhatsapp", { length: 30 }),
  welcomeMessage: text("welcomeMessage"),
  niche: varchar("niche", { length: 100 }),
  institutionalLinks: json("institutionalLinks"), // { privacy: url, terms: url, about: url }
  // White Label legal fields
  legalCompanyName: varchar("legalCompanyName", { length: 200 }),
  termsUrl: text("termsUrl"),
  privacyUrl: text("privacyUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = typeof appSettings.$inferInsert;

// ── AI Instructions ──
export const aiInstructions = pgTable("ai_instructions", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).default("default").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  category: instructionCategoryEnum("category").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdBy: integer("createdBy"),
  updatedBy: integer("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AiInstruction = typeof aiInstructions.$inferSelect;
export type InsertAiInstruction = typeof aiInstructions.$inferInsert;

// ── Knowledge Base ──
export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).default("default").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  content: text("content").notNull(),
  tags: text("tags"), // comma-separated tags for simple search
  isActive: boolean("isActive").default(true).notNull(),
  origin: varchar("origin", { length: 100 }), // manual, import, api
  createdBy: integer("createdBy"),
  updatedBy: integer("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type KnowledgeBaseItem = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseItem = typeof knowledgeBase.$inferInsert;

// ── AI Provider Logs ──
export const aiProviderLogs = pgTable("ai_provider_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  conversationId: integer("conversationId"),
  question: text("question"),
  response: text("response"),
  provider: varchar("provider", { length: 50 }).notNull(), // gemini, openai, anthropic, openrouter, cloud, local_gpu, forge
  model: varchar("model", { length: 100 }).notNull(),
  endpoint: varchar("endpoint", { length: 500 }), // URL without API key
  responseTimeMs: integer("responseTimeMs"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("errorMessage"),
  fallbackUsed: boolean("fallbackUsed").default(false),
  fallbackProvider: varchar("fallbackProvider", { length: 50 }),
  tokenCount: integer("tokenCount"),
  // Capability routing fields
  taskType: varchar("taskType", { length: 50 }),
  capabilityScore: integer("capabilityScore"),
  routingReason: text("routingReason"),
  estimatedCostUsd: text("estimatedCostUsd"), // stored as text to avoid decimal precision issues
  inputTokens: integer("inputTokens"),
  outputTokens: integer("outputTokens"),
  knowledgeSource: varchar("knowledgeSource", { length: 100 }),
  knowledgeItemsUsed: integer("knowledgeItemsUsed").default(0),
  wasRouted: boolean("wasRouted").default(false),
  modelUsed: varchar("modelUsed", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiProviderLog = typeof aiProviderLogs.$inferSelect;
export type InsertAiProviderLog = typeof aiProviderLogs.$inferInsert;

// ── Audit Logs ──
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(), // user, instruction, knowledge, settings, provider
  entityId: integer("entityId"),
  metadata: json("metadata"), // additional context as JSON
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ── Auth Verification Tokens ──
export const authVerificationTokens = pgTable("auth_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: verificationTypeEnum("type").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthVerificationToken = typeof authVerificationTokens.$inferSelect;
export type InsertAuthVerificationToken = typeof authVerificationTokens.$inferInsert;

// ── Learning Suggestions ──
export const learningSuggestionStatusEnum = pgEnum("learning_suggestion_status", ["pending", "approved", "rejected"]);
export const learningSuggestionOriginEnum = pgEnum("learning_suggestion_origin", ["chat", "log", "manual", "import", "documentation"]);

export const learningSuggestions = pgTable("learning_suggestions", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).default("default").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  origin: learningSuggestionOriginEnum("origin").default("chat").notNull(),
  provider: varchar("provider", { length: 50 }), // gemini, openai, ollama, cloud, forge
  status: learningSuggestionStatusEnum("status").default("pending").notNull(),
  sourceConversationId: integer("sourceConversationId"),
  sourceMessageId: integer("sourceMessageId"),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  knowledgeItemId: integer("knowledgeItemId"), // FK to knowledge_base if approved
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LearningSuggestion = typeof learningSuggestions.$inferSelect;
export type InsertLearningSuggestion = typeof learningSuggestions.$inferInsert;

// ── Learning Interactions ──
export const learningInteractions = pgTable("learning_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  conversationId: integer("conversationId"),
  messageId: integer("messageId"),
  interactionType: varchar("interactionType", { length: 50 }).default("chat").notNull(),
  userMessage: text("userMessage").notNull(),
  assistantResponse: text("assistantResponse"),
  taskType: varchar("taskType", { length: 50 }),
  providerUsed: varchar("providerUsed", { length: 50 }),
  wasHelpful: boolean("wasHelpful"),
  userFeedback: text("userFeedback"),
  tokensUsed: integer("tokensUsed").default(0),
  responseTimeMs: integer("responseTimeMs").default(0),
  knowledgeItemsMatched: integer("knowledgeItemsMatched").default(0),
  suggestedForKb: boolean("suggestedForKb").default(false),
  kbSuggestionStatus: varchar("kbSuggestionStatus", { length: 20 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LearningInteraction = typeof learningInteractions.$inferSelect;
export type InsertLearningInteraction = typeof learningInteractions.$inferInsert;

// ══════════════════════════════════════════════════════════════
// Generated Assets (images, videos, diagrams, audio)
// ══════════════════════════════════════════════════════════════

export const generatedAssets = pgTable("generated_assets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  conversationId: integer("conversation_id"),
  messageId: integer("message_id"),
  tenantId: varchar("tenant_id", { length: 100 }).default("default"),
  // Asset type and content
  assetType: varchar("asset_type", { length: 30 }).notNull(), // 'image', 'video', 'diagram', 'audio'
  title: varchar("title", { length: 500 }),
  prompt: text("prompt").notNull(),
  revisedPrompt: text("revised_prompt"),
  // Storage
  url: text("url"),
  thumbnailUrl: text("thumbnail_url"),
  storageKey: text("storage_key"),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 100 }),
  // Generation details
  provider: varchar("provider", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  generationParams: jsonb("generation_params").default({}),
  generationTimeMs: integer("generation_time_ms"),
  estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }),
  // For diagrams
  mermaidCode: text("mermaid_code"),
  drawioXml: text("drawio_xml"),
  diagramType: varchar("diagram_type", { length: 50 }),
  // Status
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  errorMessage: text("error_message"),
  // Metadata
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type GeneratedAsset = typeof generatedAssets.$inferSelect;
export type InsertGeneratedAsset = typeof generatedAssets.$inferInsert;

// ══════════════════════════════════════════════════════════════
// Generation Jobs (async video/audio generation)
// ══════════════════════════════════════════════════════════════

export const generationJobs = pgTable("generation_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  conversationId: integer("conversation_id"),
  tenantId: varchar("tenant_id", { length: 100 }).default("default"),
  // Job details
  jobType: varchar("job_type", { length: 30 }).notNull(), // 'video', 'audio', 'upscale'
  externalJobId: varchar("external_job_id", { length: 200 }),
  provider: varchar("provider", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  prompt: text("prompt").notNull(),
  params: jsonb("params").default({}),
  // Status
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  progress: integer("progress").default(0),
  resultAssetId: integer("result_asset_id"),
  resultUrl: text("result_url"),
  errorMessage: text("error_message"),
  estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }),
  // Timestamps
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

// ══════════════════════════════════════════════════════════════
// Capability Usage Logs
// ══════════════════════════════════════════════════════════════

export const capabilityUsageLogs = pgTable("capability_usage_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tenantId: varchar("tenant_id", { length: 100 }).default("default"),
  capability: varchar("capability", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 50 }),
  model: varchar("model", { length: 100 }),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CapabilityUsageLog = typeof capabilityUsageLogs.$inferSelect;
export type InsertCapabilityUsageLog = typeof capabilityUsageLogs.$inferInsert;
