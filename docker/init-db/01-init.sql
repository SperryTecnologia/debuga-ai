-- ============================================================
-- debuga.ai homolog - Initial database setup
-- This runs automatically when PostgreSQL container starts
-- for the first time (empty data volume).
-- MUST match drizzle/schema.ts exactly.
-- ============================================================

-- Create enums
DO $$ BEGIN
  CREATE TYPE role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('google', 'local');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_type AS ENUM ('email', 'phone', 'password_reset');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE instruction_category AS ENUM (
    'comportamento', 'atendimento', 'suporte_tecnico', 'vendas',
    'restricoes', 'encaminhamento_humano', 'seguranca', 'cliente_especifico'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  phone VARCHAR(30),
  "passwordHash" TEXT,
  "authProvider" auth_provider DEFAULT 'google',
  "googleOpenId" VARCHAR(64),
  "loginMethod" VARCHAR(64),
  role role NOT NULL DEFAULT 'user',
  "tenantId" VARCHAR(64) DEFAULT 'default',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  "termsAcceptedAt" TIMESTAMP,
  "privacyAcceptedAt" TIMESTAMP,
  "lastLoginAt" TIMESTAMP,
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW(),
  "stripeCustomerId" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Nova conversa',
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  "conversationId" INTEGER NOT NULL,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  "toolCalls" JSON,
  "tokenCount" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "stripeSubscriptionId" VARCHAR(255) NOT NULL UNIQUE,
  "stripePriceId" VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  "currentPeriodEnd" TIMESTAMP,
  "cancelAtPeriodEnd" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credits (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "totalCredits" INTEGER NOT NULL DEFAULT 0,
  "usedCredits" INTEGER NOT NULL DEFAULT 0,
  "planId" VARCHAR(50) NOT NULL DEFAULT 'free',
  "resetAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_log (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "conversationId" INTEGER,
  "tokensUsed" INTEGER NOT NULL DEFAULT 0,
  "toolName" VARCHAR(100),
  description VARCHAR(500),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "eventType" VARCHAR(50) NOT NULL,
  "conversationId" INTEGER,
  "periodKey" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN PANEL TABLES (must match drizzle/schema.ts exactly)
-- ============================================================

-- App Settings (White Label - single row per tenant with named columns)
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  "tenantId" VARCHAR(64) NOT NULL DEFAULT 'default' UNIQUE,
  "appName" VARCHAR(100) DEFAULT 'debuga.ai',
  "agentName" VARCHAR(100) DEFAULT 'debuga.ai',
  "landingTitle" VARCHAR(200),
  "landingSubtitle" TEXT,
  "primaryColor" VARCHAR(20) DEFAULT '#22c55e',
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "supportEmail" VARCHAR(320),
  "supportWhatsapp" VARCHAR(30),
  "welcomeMessage" TEXT,
  niche VARCHAR(100),
  "institutionalLinks" JSON,
  "legalCompanyName" VARCHAR(200),
  "termsUrl" TEXT,
  "privacyUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI Instructions (behavior rules injected into system prompt)
CREATE TABLE IF NOT EXISTS ai_instructions (
  id SERIAL PRIMARY KEY,
  "tenantId" VARCHAR(64) NOT NULL DEFAULT 'default',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category instruction_category NOT NULL DEFAULT 'comportamento',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  "createdBy" INTEGER,
  "updatedBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Knowledge Base (reference data for AI responses)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  "tenantId" VARCHAR(64) NOT NULL DEFAULT 'default',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  origin VARCHAR(100),
  "createdBy" INTEGER,
  "updatedBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI Provider Logs (LLM call history)
CREATE TABLE IF NOT EXISTS ai_provider_logs (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER,
  "conversationId" INTEGER,
  question TEXT,
  response TEXT,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  endpoint VARCHAR(500),
  "responseTimeMs" INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "fallbackUsed" BOOLEAN DEFAULT false,
  "fallbackProvider" VARCHAR(50),
  "tokenCount" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Auth Verification Tokens
CREATE TABLE IF NOT EXISTS auth_verification_tokens (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  type verification_type NOT NULL,
  "tokenHash" VARCHAR(128) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_verification_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Audit Logs (admin action tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER,
  action VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(50) NOT NULL,
  "entityId" INTEGER,
  metadata JSON,
  "ipAddress" VARCHAR(45),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users("tenantId");
CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations("userId");
CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_credits_userId ON credits("userId");
CREATE INDEX IF NOT EXISTS idx_usage_log_userId ON usage_log("userId");
CREATE INDEX IF NOT EXISTS idx_usage_events_userId_period ON usage_events("userId", "periodKey");
CREATE INDEX IF NOT EXISTS idx_subscriptions_userId ON subscriptions("userId");
CREATE INDEX IF NOT EXISTS idx_ai_instructions_tenant_active ON ai_instructions("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant_active ON knowledge_base("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS idx_ai_provider_logs_user ON ai_provider_logs("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON auth_verification_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_verification_tokens_hash ON auth_verification_tokens("tokenHash");
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users("emailVerified");
CREATE INDEX IF NOT EXISTS idx_users_locked ON users("lockedUntil");

-- ============================================================
-- LEARNING SUGGESTIONS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE learning_suggestion_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE learning_suggestion_origin AS ENUM ('chat', 'log', 'manual', 'import', 'documentation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS learning_suggestions (
  id SERIAL PRIMARY KEY,
  "tenantId" VARCHAR(64) NOT NULL DEFAULT 'default',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  origin learning_suggestion_origin NOT NULL DEFAULT 'chat',
  provider VARCHAR(50),
  status learning_suggestion_status NOT NULL DEFAULT 'pending',
  "sourceConversationId" INTEGER,
  "sourceMessageId" INTEGER,
  "reviewedBy" INTEGER,
  "reviewedAt" TIMESTAMP,
  "knowledgeItemId" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_suggestions_status ON learning_suggestions (status);
CREATE INDEX IF NOT EXISTS idx_learning_suggestions_tenant ON learning_suggestions ("tenantId");
