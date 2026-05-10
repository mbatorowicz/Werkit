ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "brand" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "model" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "registration_number" varchar(32) DEFAULT '' NOT NULL;
