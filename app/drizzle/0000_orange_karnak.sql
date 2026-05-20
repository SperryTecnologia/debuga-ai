CREATE TYPE "public"."auth_provider" AS ENUM('google', 'local');--> statement-breakpoint
CREATE TYPE "public"."instruction_category" AS ENUM('comportamento', 'atendimento', 'suporte_tecnico', 'vendas', 'restricoes', 'encaminhamento_humano', 'seguranca', 'cliente_especifico');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "ai_instructions" (
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
--> statement-breakpoint
CREATE TABLE "ai_provider_logs" (
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
--> statement-breakpoint
CREATE TABLE "app_settings" (
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
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" integer,
	"metadata" json,
	"ipAddress" varchar(45),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) DEFAULT 'Nova conversa' NOT NULL,
	"isPinned" boolean DEFAULT false NOT NULL,
	"isArchived" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"totalCredits" integer DEFAULT 0 NOT NULL,
	"usedCredits" integer DEFAULT 0 NOT NULL,
	"planId" varchar(50) DEFAULT 'free' NOT NULL,
	"resetAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
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
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"toolCalls" json,
	"tokenCount" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"stripeSubscriptionId" varchar(255) NOT NULL,
	"stripePriceId" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"currentPeriodEnd" timestamp,
	"cancelAtPeriodEnd" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"eventType" varchar(50) NOT NULL,
	"conversationId" integer,
	"periodKey" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"conversationId" integer,
	"tokensUsed" integer DEFAULT 0 NOT NULL,
	"toolName" varchar(100),
	"description" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"phone" varchar(30),
	"passwordHash" text,
	"authProvider" "auth_provider" DEFAULT 'google',
	"googleOpenId" varchar(64),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"tenantId" varchar(64) DEFAULT 'default',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	"stripeCustomerId" varchar(255),
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
