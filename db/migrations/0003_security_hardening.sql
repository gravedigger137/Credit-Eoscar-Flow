ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_totp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_recovery_code_hashes" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_confirmed_at" timestamp;
