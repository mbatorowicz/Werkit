ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_create_customers" boolean NOT NULL DEFAULT false;
