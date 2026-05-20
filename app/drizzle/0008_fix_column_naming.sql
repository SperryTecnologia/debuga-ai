-- Migration: Fix column naming inconsistency in ai_provider_logs
-- Date: 2025-05-19
-- Description: Migrations 0005 and 0007 added columns in snake_case but the table uses camelCase.
--              This migration renames snake_case columns to camelCase to match Drizzle schema.
--              Also removes duplicate columns (fallback_used vs "fallbackUsed", etc.)
--              Fully idempotent — safe to run multiple times.

-- ══════════════════════════════════════════════════════════════
-- 1. Fix ai_provider_logs: rename snake_case → camelCase
--    (0005 added: task_type, capability_score, routing_reason, estimated_cost_usd,
--     input_tokens, output_tokens, knowledge_source, knowledge_items_used)
-- ══════════════════════════════════════════════════════════════

-- Rename task_type → "taskType" (if task_type exists and "taskType" doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'task_type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'taskType')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN task_type TO "taskType";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'task_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'taskType')
  THEN
    -- Both exist: copy data from snake_case to camelCase where camelCase is null, then drop snake_case
    UPDATE ai_provider_logs SET "taskType" = task_type WHERE "taskType" IS NULL AND task_type IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN task_type;
  END IF;
END $$;

-- Rename capability_score → "capabilityScore"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'capability_score')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'capabilityScore')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN capability_score TO "capabilityScore";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'capability_score')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'capabilityScore')
  THEN
    UPDATE ai_provider_logs SET "capabilityScore" = capability_score WHERE "capabilityScore" IS NULL AND capability_score IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN capability_score;
  END IF;
END $$;

-- Rename routing_reason → "routingReason"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'routing_reason')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'routingReason')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN routing_reason TO "routingReason";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'routing_reason')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'routingReason')
  THEN
    UPDATE ai_provider_logs SET "routingReason" = routing_reason WHERE "routingReason" IS NULL AND routing_reason IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN routing_reason;
  END IF;
END $$;

-- Rename estimated_cost_usd → "estimatedCostUsd"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'estimated_cost_usd')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'estimatedCostUsd')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN estimated_cost_usd TO "estimatedCostUsd";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'estimated_cost_usd')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'estimatedCostUsd')
  THEN
    UPDATE ai_provider_logs SET "estimatedCostUsd" = estimated_cost_usd::text WHERE "estimatedCostUsd" IS NULL AND estimated_cost_usd IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN estimated_cost_usd;
  END IF;
END $$;

-- Rename input_tokens → "inputTokens"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'input_tokens')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'inputTokens')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN input_tokens TO "inputTokens";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'input_tokens')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'inputTokens')
  THEN
    UPDATE ai_provider_logs SET "inputTokens" = input_tokens WHERE "inputTokens" IS NULL AND input_tokens IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN input_tokens;
  END IF;
END $$;

-- Rename output_tokens → "outputTokens"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'output_tokens')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'outputTokens')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN output_tokens TO "outputTokens";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'output_tokens')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'outputTokens')
  THEN
    UPDATE ai_provider_logs SET "outputTokens" = output_tokens WHERE "outputTokens" IS NULL AND output_tokens IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN output_tokens;
  END IF;
END $$;

-- Rename knowledge_source → "knowledgeSource"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledge_source')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledgeSource')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN knowledge_source TO "knowledgeSource";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledge_source')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledgeSource')
  THEN
    UPDATE ai_provider_logs SET "knowledgeSource" = knowledge_source WHERE "knowledgeSource" IS NULL AND knowledge_source IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN knowledge_source;
  END IF;
END $$;

-- Rename knowledge_items_used → "knowledgeItemsUsed"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledge_items_used')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledgeItemsUsed')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN knowledge_items_used TO "knowledgeItemsUsed";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledge_items_used')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'knowledgeItemsUsed')
  THEN
    UPDATE ai_provider_logs SET "knowledgeItemsUsed" = knowledge_items_used WHERE "knowledgeItemsUsed" IS NULL AND knowledge_items_used IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN knowledge_items_used;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. Fix duplicate columns from migration 0007
--    0007 added fallback_used, fallback_provider, was_routed, model_used (snake_case)
--    But 0000 already has "fallbackUsed" and "fallbackProvider" (camelCase)
-- ══════════════════════════════════════════════════════════════

-- Remove duplicate fallback_used (original "fallbackUsed" already exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'fallback_used')
  THEN
    -- Copy any data from snake_case to camelCase before dropping
    UPDATE ai_provider_logs SET "fallbackUsed" = fallback_used WHERE "fallbackUsed" IS NULL AND fallback_used IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN fallback_used;
  END IF;
END $$;

-- Remove duplicate fallback_provider (original "fallbackProvider" already exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'fallback_provider')
  THEN
    UPDATE ai_provider_logs SET "fallbackProvider" = fallback_provider WHERE "fallbackProvider" IS NULL AND fallback_provider IS NOT NULL;
    ALTER TABLE ai_provider_logs DROP COLUMN fallback_provider;
  END IF;
END $$;

-- Rename was_routed → "wasRouted" (new column, doesn't exist in camelCase yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'was_routed')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'wasRouted')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN was_routed TO "wasRouted";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'was_routed')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'wasRouted')
  THEN
    ALTER TABLE ai_provider_logs DROP COLUMN was_routed;
  END IF;
END $$;

-- Rename model_used → "modelUsed" (new column, doesn't exist in camelCase yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'model_used')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'modelUsed')
  THEN
    ALTER TABLE ai_provider_logs RENAME COLUMN model_used TO "modelUsed";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'model_used')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_provider_logs' AND column_name = 'modelUsed')
  THEN
    ALTER TABLE ai_provider_logs DROP COLUMN model_used;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. Ensure all camelCase columns exist (for fresh databases)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "taskType" VARCHAR(50) DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "capabilityScore" INT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "routingReason" TEXT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "estimatedCostUsd" TEXT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "inputTokens" INT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "outputTokens" INT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "knowledgeSource" VARCHAR(100) DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "knowledgeItemsUsed" INT DEFAULT 0;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "wasRouted" BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS "modelUsed" VARCHAR(100) DEFAULT NULL;

-- ══════════════════════════════════════════════════════════════
-- 4. Recreate indexes with correct column names
-- ══════════════════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_provider_logs_task_type;
DROP INDEX IF EXISTS idx_provider_logs_cost;
CREATE INDEX IF NOT EXISTS idx_provider_logs_task_type ON ai_provider_logs("taskType");
CREATE INDEX IF NOT EXISTS idx_provider_logs_cost ON ai_provider_logs("estimatedCostUsd") WHERE "estimatedCostUsd" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provider_logs_was_routed ON ai_provider_logs("wasRouted") WHERE "wasRouted" = TRUE;

-- ══════════════════════════════════════════════════════════════
-- 5. Fix users table cost columns (ensure they exist with camelCase)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS "dailyCostLimitUsd" DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "monthlyCostLimitUsd" DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "totalCostUsd" DECIMAL(10, 4) DEFAULT 0;

-- Remove snake_case duplicates from 0007 if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'daily_cost_limit_usd')
  THEN
    UPDATE users SET "dailyCostLimitUsd" = daily_cost_limit_usd WHERE "dailyCostLimitUsd" IS NULL AND daily_cost_limit_usd IS NOT NULL;
    ALTER TABLE users DROP COLUMN daily_cost_limit_usd;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'monthly_cost_limit_usd')
  THEN
    UPDATE users SET "monthlyCostLimitUsd" = monthly_cost_limit_usd WHERE "monthlyCostLimitUsd" IS NULL AND monthly_cost_limit_usd IS NOT NULL;
    ALTER TABLE users DROP COLUMN monthly_cost_limit_usd;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_cost_usd')
  THEN
    UPDATE users SET "totalCostUsd" = total_cost_usd WHERE "totalCostUsd" IS NULL AND total_cost_usd IS NOT NULL;
    ALTER TABLE users DROP COLUMN total_cost_usd;
  END IF;
END $$;
