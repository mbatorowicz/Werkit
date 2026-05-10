ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "biometric_login_enabled" boolean DEFAULT false NOT NULL;
