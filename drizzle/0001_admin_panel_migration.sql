-- Migration: Admin Panel + White Label + Local Auth
-- Apply this AFTER the initial schema (0000) if upgrading an existing database.
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS patterns).

-- New enums
DO $$ BEGIN
  CREATE TYPE "auth_provider" AS ENUM ('google', 'local');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "instruction_category" AS ENUM (
    'comportamento', 'atendimento', 'suporte_tecnico', 'vendas',
    'restricoes', 'encaminhamento_humano', 'seguranca', 'cliente_especifico'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Alter users table (add new columns if not exist)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authProvider" "auth_provider" DEFAULT 'google';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleOpenId" varchar(64);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenantId" varchar(64) DEFAULT 'default';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true NOT NULL;

-- New table: app_settings
CREATE TABLE IF NOT EXISTS "app_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenantId" varchar(64) DEFAULT 'default' NOT NULL,
  "appName" varchar(100) DEFAULT 'debuga.ai',
  "agentName" varchar(100) DEFAULT 'debuga.ai',
  "landingTitle" varchar(200),
  "landingSubtitle" text,
  "primaryColor" varchar(20) DEFAULT '#22c55e',
  "logoUrl" text,
  "faviconUrl" text,
  "supportEmail" varchar(320),
  "supportWhatsapp" varchar(30),
  "welcomeMessage" text,
  "niche" varchar(100),
  "institutionalLinks" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "app_settings_tenantId_unique" UNIQUE("tenantId")
);

-- New table: ai_instructions
CREATE TABLE IF NOT EXISTS "ai_instructions" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenantId" varchar(64) DEFAULT 'default' NOT NULL,
  "title" varchar(200) NOT NULL,
  "content" text NOT NULL,
  "category" "instruction_category" NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "createdBy" integer,
  "updatedBy" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- New table: knowledge_base
CREATE TABLE IF NOT EXISTS "knowledge_base" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenantId" varchar(64) DEFAULT 'default' NOT NULL,
  "title" varchar(200) NOT NULL,
  "category" varchar(100),
  "content" text NOT NULL,
  "tags" text,
  "isActive" boolean DEFAULT true NOT NULL,
  "origin" varchar(100),
  "createdBy" integer,
  "updatedBy" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- New table: ai_provider_logs
CREATE TABLE IF NOT EXISTS "ai_provider_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer,
  "conversationId" integer,
  "question" text,
  "response" text,
  "provider" varchar(50) NOT NULL,
  "model" varchar(100) NOT NULL,
  "endpoint" varchar(500),
  "responseTimeMs" integer,
  "success" boolean DEFAULT true NOT NULL,
  "errorMessage" text,
  "fallbackUsed" boolean DEFAULT false,
  "fallbackProvider" varchar(50),
  "tokenCount" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- New table: audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer,
  "action" varchar(100) NOT NULL,
  "entityType" varchar(50) NOT NULL,
  "entityId" integer,
  "metadata" json,
  "ipAddress" varchar(45),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- Insert default app_settings row
INSERT INTO "app_settings" ("tenantId", "appName", "agentName", "primaryColor", "welcomeMessage")
VALUES ('default', 'debuga.ai', 'debuga.ai', '#22c55e', 'Olá! Como posso ajudar você hoje?')
ON CONFLICT ("tenantId") DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_ai_instructions_tenant_active" ON "ai_instructions" ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_knowledge_base_tenant_active" ON "knowledge_base" ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_ai_provider_logs_created" ON "ai_provider_logs" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_ai_provider_logs_user" ON "ai_provider_logs" ("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs" ("userId");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_tenant" ON "users" ("tenantId");
