-- ============================================================
-- Migration 0003: Auth Hardening
-- Adds email/phone verification, terms acceptance, login tracking,
-- account lockout, and auth_verification_tokens table.
-- ============================================================

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP;

-- For Google OAuth users, set emailVerified = true by default
UPDATE users SET "emailVerified" = true WHERE "authProvider" = 'google' AND "emailVerified" = false;

-- Create verification token type enum
DO $$ BEGIN
  CREATE TYPE verification_type AS ENUM ('email', 'phone', 'password_reset');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create auth_verification_tokens table
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

-- Add White Label legal fields to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "legalCompanyName" VARCHAR(200);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "termsUrl" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "privacyUrl" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON auth_verification_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_verification_tokens_hash ON auth_verification_tokens("tokenHash");
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users("emailVerified");
CREATE INDEX IF NOT EXISTS idx_users_locked ON users("lockedUntil");
