-- Migration: Multimodal Assets & Generation Jobs
-- Date: 2025-05-19
-- Description: Tables for image/video/diagram generation tracking, async jobs, and capability usage

-- ══════════════════════════════════════════════════════════════
-- 1. Generated Assets — stores metadata for all generated content
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS generated_assets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  conversation_id INT DEFAULT NULL,
  message_id INT DEFAULT NULL,
  tenant_id VARCHAR(100) DEFAULT 'default',

  -- Asset type and content
  asset_type VARCHAR(30) NOT NULL, -- 'image', 'video', 'diagram', 'audio'
  title VARCHAR(500) DEFAULT NULL,
  prompt TEXT NOT NULL,
  revised_prompt TEXT DEFAULT NULL,

  -- Storage
  url TEXT DEFAULT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  storage_key TEXT DEFAULT NULL,
  file_size_bytes BIGINT DEFAULT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,

  -- Generation details
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  generation_params JSONB DEFAULT '{}', -- size, quality, style, duration, etc.
  generation_time_ms INT DEFAULT NULL,
  estimated_cost_usd DECIMAL(10, 6) DEFAULT NULL,

  -- For diagrams specifically
  mermaid_code TEXT DEFAULT NULL,
  drawio_xml TEXT DEFAULT NULL,
  diagram_type VARCHAR(50) DEFAULT NULL, -- network, architecture, flowchart

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'completed', -- pending, processing, completed, failed, deleted
  error_message TEXT DEFAULT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for generated_assets
CREATE INDEX IF NOT EXISTS idx_generated_assets_user_id ON generated_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_tenant_id ON generated_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_asset_type ON generated_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_generated_assets_status ON generated_assets(status);
CREATE INDEX IF NOT EXISTS idx_generated_assets_conversation_id ON generated_assets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_created_at ON generated_assets(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- 2. Generation Jobs — async job tracking (video, long-running)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS generation_jobs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  conversation_id INT DEFAULT NULL,
  tenant_id VARCHAR(100) DEFAULT 'default',

  -- Job identification
  external_job_id VARCHAR(500) DEFAULT NULL, -- provider's job/prediction ID
  job_type VARCHAR(30) NOT NULL, -- 'video', 'audio', 'image_batch'

  -- Request details
  prompt TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  generation_params JSONB DEFAULT '{}',

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, submitted, processing, completed, failed, cancelled
  progress_percent INT DEFAULT 0,
  estimated_completion_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,

  -- Result
  result_url TEXT DEFAULT NULL,
  result_thumbnail_url TEXT DEFAULT NULL,
  result_asset_id INT DEFAULT NULL, -- FK to generated_assets
  estimated_cost_usd DECIMAL(10, 6) DEFAULT NULL,

  -- Error handling
  error_message TEXT DEFAULT NULL,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  last_polled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Indexes for generation_jobs
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_job_type ON generation_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_external_id ON generation_jobs(external_job_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_pending ON generation_jobs(status, last_polled_at)
  WHERE status IN ('submitted', 'processing');

-- ══════════════════════════════════════════════════════════════
-- 3. Capability Usage Logs — per-capability cost/usage tracking
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS capability_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  tenant_id VARCHAR(100) DEFAULT 'default',

  -- Capability details
  task_type VARCHAR(50) NOT NULL,
  capability VARCHAR(50) NOT NULL, -- 'text', 'image_gen', 'video_gen', 'diagram', 'vision', etc.
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,

  -- Usage metrics
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  tokens_total INT DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  response_time_ms INT DEFAULT 0,

  -- Result
  success BOOLEAN DEFAULT TRUE,
  error_code VARCHAR(50) DEFAULT NULL,
  was_fallback BOOLEAN DEFAULT FALSE,
  was_routed BOOLEAN DEFAULT FALSE,
  routing_reason TEXT DEFAULT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for capability_usage_logs
CREATE INDEX IF NOT EXISTS idx_capability_usage_user_id ON capability_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_capability_usage_tenant_id ON capability_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capability_usage_task_type ON capability_usage_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_capability_usage_capability ON capability_usage_logs(capability);
CREATE INDEX IF NOT EXISTS idx_capability_usage_provider ON capability_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_capability_usage_created_at ON capability_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capability_usage_cost ON capability_usage_logs(cost_usd)
  WHERE cost_usd > 0;

-- Composite index for daily/monthly cost aggregation
CREATE INDEX IF NOT EXISTS idx_capability_usage_user_date ON capability_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capability_usage_tenant_date ON capability_usage_logs(tenant_id, created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- 4. Add fallback tracking fields to ai_provider_logs
-- ══════════════════════════════════════════════════════════════
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS fallback_provider VARCHAR(50) DEFAULT NULL;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS was_routed BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_provider_logs ADD COLUMN IF NOT EXISTS model_used VARCHAR(100) DEFAULT NULL;

-- ══════════════════════════════════════════════════════════════
-- 5. Add cost budget fields to users table (if exists)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_cost_limit_usd DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_cost_limit_usd DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cost_usd DECIMAL(10, 4) DEFAULT 0;
