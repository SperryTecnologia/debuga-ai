-- Migration: Fix user FK references (user → users)
-- Date: 2025-05-19
-- Description: Corrective migration for databases that already applied 0006 with wrong table name.
--              Also adds proper FK constraints from generated_assets, generation_jobs, and
--              capability_usage_logs to users(id). Fully idempotent.

-- ══════════════════════════════════════════════════════════════
-- 1. Ensure cost budget columns exist on 'users' table
--    (0006 originally referenced "user" which failed)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_cost_limit_usd DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_cost_limit_usd DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cost_usd DECIMAL(10, 4) DEFAULT 0;

-- ══════════════════════════════════════════════════════════════
-- 2. Add FK constraints (idempotent — skip if already exists)
-- ══════════════════════════════════════════════════════════════

-- generated_assets.user_id → users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_generated_assets_user_id'
      AND table_name = 'generated_assets'
  ) THEN
    ALTER TABLE generated_assets
      ADD CONSTRAINT fk_generated_assets_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- generation_jobs.user_id → users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_generation_jobs_user_id'
      AND table_name = 'generation_jobs'
  ) THEN
    ALTER TABLE generation_jobs
      ADD CONSTRAINT fk_generation_jobs_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- capability_usage_logs.user_id → users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_capability_usage_logs_user_id'
      AND table_name = 'capability_usage_logs'
  ) THEN
    ALTER TABLE capability_usage_logs
      ADD CONSTRAINT fk_capability_usage_logs_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- generation_jobs.result_asset_id → generated_assets(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_generation_jobs_result_asset'
      AND table_name = 'generation_jobs'
  ) THEN
    ALTER TABLE generation_jobs
      ADD CONSTRAINT fk_generation_jobs_result_asset
      FOREIGN KEY (result_asset_id) REFERENCES generated_assets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. Ensure all tables from 0006 exist (idempotent for fresh DBs)
-- ══════════════════════════════════════════════════════════════

-- generated_assets
CREATE TABLE IF NOT EXISTS generated_assets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  conversation_id INT DEFAULT NULL,
  message_id INT DEFAULT NULL,
  tenant_id VARCHAR(100) DEFAULT 'default',
  asset_type VARCHAR(30) NOT NULL,
  title VARCHAR(500) DEFAULT NULL,
  prompt TEXT NOT NULL,
  revised_prompt TEXT DEFAULT NULL,
  url TEXT DEFAULT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  storage_key TEXT DEFAULT NULL,
  file_size_bytes BIGINT DEFAULT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  generation_params JSONB DEFAULT '{}',
  generation_time_ms INT DEFAULT NULL,
  estimated_cost_usd DECIMAL(10, 6) DEFAULT NULL,
  mermaid_code TEXT DEFAULT NULL,
  drawio_xml TEXT DEFAULT NULL,
  diagram_type VARCHAR(50) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  error_message TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- generation_jobs
CREATE TABLE IF NOT EXISTS generation_jobs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  conversation_id INT DEFAULT NULL,
  tenant_id VARCHAR(100) DEFAULT 'default',
  external_job_id VARCHAR(500) DEFAULT NULL,
  job_type VARCHAR(30) NOT NULL,
  prompt TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  generation_params JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  estimated_completion_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  result_url TEXT DEFAULT NULL,
  result_thumbnail_url TEXT DEFAULT NULL,
  result_asset_id INT DEFAULT NULL,
  estimated_cost_usd DECIMAL(10, 6) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  last_polled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- capability_usage_logs
CREATE TABLE IF NOT EXISTS capability_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  tenant_id VARCHAR(100) DEFAULT 'default',
  task_type VARCHAR(50) NOT NULL,
  capability VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  tokens_total INT DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  success BOOLEAN DEFAULT TRUE,
  error_code VARCHAR(50) DEFAULT NULL,
  was_fallback BOOLEAN DEFAULT FALSE,
  was_routed BOOLEAN DEFAULT FALSE,
  routing_reason TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 4. Ensure all indexes exist (idempotent)
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_generated_assets_user_id ON generated_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_tenant_id ON generated_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_asset_type ON generated_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_generated_assets_status ON generated_assets(status);
CREATE INDEX IF NOT EXISTS idx_generated_assets_conversation_id ON generated_assets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_created_at ON generated_assets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_job_type ON generation_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_external_id ON generation_jobs(external_job_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_pending ON generation_jobs(status, last_polled_at)
  WHERE status IN ('submitted', 'processing');

CREATE INDEX IF NOT EXISTS idx_capability_usage_user_id ON capability_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_capability_usage_tenant_id ON capability_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capability_usage_task_type ON capability_usage_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_capability_usage_capability ON capability_usage_logs(capability);
CREATE INDEX IF NOT EXISTS idx_capability_usage_provider ON capability_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_capability_usage_created_at ON capability_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capability_usage_cost ON capability_usage_logs(cost_usd)
  WHERE cost_usd > 0;
CREATE INDEX IF NOT EXISTS idx_capability_usage_user_date ON capability_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capability_usage_tenant_date ON capability_usage_logs(tenant_id, created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- 5. Ensure ai_provider_logs extra columns exist
-- ══════════════════════════════════════════════════════════════
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS fallback_provider VARCHAR(50) DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS was_routed BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS model_used VARCHAR(100) DEFAULT NULL;
