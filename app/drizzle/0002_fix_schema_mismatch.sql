-- ═══════════════════════════════════════════════════════════════════
-- Migration 0002: Fix schema mismatch between Drizzle and real DB
-- 
-- Apply this on existing databases that were created with the OLD
-- 01-init.sql (before commit 8914eaa fix).
--
-- This migration:
-- 1. Drops the OLD admin tables (they had wrong column structure)
-- 2. Recreates them with the CORRECT structure matching Drizzle schema
--
-- WARNING: This will DELETE all data in the admin tables.
-- If you have important data in ai_instructions, knowledge_base,
-- ai_provider_logs, audit_logs, or app_settings, back them up first.
-- ═══════════════════════════════════════════════════════════════════

-- ── Step 1: Drop old tables with wrong structure ──
DROP TABLE IF EXISTS ai_provider_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS ai_instructions CASCADE;
DROP TABLE IF EXISTS knowledge_base CASCADE;

-- ── Step 2: Recreate with correct structure (matches drizzle/schema.ts) ──

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

-- ── Step 3: Recreate indexes ──
CREATE INDEX IF NOT EXISTS idx_ai_instructions_tenant_active ON ai_instructions("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant_active ON knowledge_base("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS idx_ai_provider_logs_user ON ai_provider_logs("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs("userId");

-- ═══════════════════════════════════════════════════════════════════
-- Done. Verify with: \dt
-- All 12 tables should exist with correct column structure.
-- ═══════════════════════════════════════════════════════════════════
