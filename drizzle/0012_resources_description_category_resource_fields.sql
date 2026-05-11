ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "description" text;

ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_resource_name" boolean DEFAULT true NOT NULL;
ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_resource_description" boolean DEFAULT false NOT NULL;
ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_registration_number" boolean DEFAULT true NOT NULL;
