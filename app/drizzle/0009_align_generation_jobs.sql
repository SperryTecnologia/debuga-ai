-- ═══════════════════════════════════════════════════════════════
-- Migration 0009: Align generation_jobs with schema.ts
-- ═══════════════════════════════════════════════════════════════
-- The schema.ts uses simplified column names compared to the
-- original migration 0006. This migration adds missing columns
-- and renames where needed to match the Drizzle schema.
-- ═══════════════════════════════════════════════════════════════

-- Add columns that exist in schema.ts but not in migration 0006
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}';
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Copy data from old columns to new ones (if old columns exist)
DO $$
BEGIN
  -- Copy generation_params → params
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generation_jobs' AND column_name='generation_params') THEN
    UPDATE generation_jobs SET params = generation_params WHERE params IS NULL OR params = '{}';
  END IF;
  -- Copy progress_percent → progress
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generation_jobs' AND column_name='progress_percent') THEN
    UPDATE generation_jobs SET progress = progress_percent WHERE progress IS NULL OR progress = 0;
  END IF;
END $$;

-- Note: We keep the old columns for backward compatibility.
-- The schema.ts only references the new column names.
-- Old columns (generation_params, progress_percent, estimated_completion_at,
-- last_polled_at, retry_count, max_retries, metadata, result_thumbnail_url)
-- remain in the DB but are not referenced by Drizzle schema.
