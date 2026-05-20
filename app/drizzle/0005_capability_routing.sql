-- Migration: Capability Routing & Learning Interactions
-- Date: 2025-05-19
-- Description: Add capability/cost tracking to provider_logs and create learning_interactions table

-- ══════════════════════════════════════════════════════════════
-- 1. Add capability routing fields to ai_provider_logs
-- ══════════════════════════════════════════════════════════════

ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS capability_score INT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS routing_reason TEXT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS estimated_cost_usd DECIMAL(10, 6) DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS knowledge_source VARCHAR(100) DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS knowledge_items_used INT DEFAULT 0;

-- ══════════════════════════════════════════════════════════════
-- 2. Create learning_interactions table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learning_interactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  conversation_id INT DEFAULT NULL,
  message_id INT DEFAULT NULL,
  interaction_type VARCHAR(50) NOT NULL DEFAULT 'chat',
  user_message TEXT NOT NULL,
  assistant_response TEXT DEFAULT NULL,
  task_type VARCHAR(50) DEFAULT NULL,
  provider_used VARCHAR(50) DEFAULT NULL,
  was_helpful BOOLEAN DEFAULT NULL,
  user_feedback TEXT DEFAULT NULL,
  tokens_used INT DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  knowledge_items_matched INT DEFAULT 0,
  suggested_for_kb BOOLEAN DEFAULT FALSE,
  kb_suggestion_status VARCHAR(20) DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for learning_interactions
CREATE INDEX IF NOT EXISTS idx_learning_interactions_user_id ON learning_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_task_type ON learning_interactions(task_type);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_created_at ON learning_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_suggested_for_kb ON learning_interactions(suggested_for_kb) WHERE suggested_for_kb = TRUE;
CREATE INDEX IF NOT EXISTS idx_learning_interactions_kb_suggestion_status ON learning_interactions(kb_suggestion_status);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_conversation_id ON learning_interactions(conversation_id);

-- ══════════════════════════════════════════════════════════════
-- 3. Add index for task_type queries on provider_logs
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_provider_logs_task_type ON ai_provider_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_provider_logs_cost ON ai_provider_logs(estimated_cost_usd) WHERE estimated_cost_usd IS NOT NULL;
