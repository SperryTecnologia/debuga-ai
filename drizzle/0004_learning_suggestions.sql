-- Migration: Add learning_suggestions table
-- Date: 2026-05-18
-- Description: Table for tracking AI learning suggestions from conversations/logs

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
