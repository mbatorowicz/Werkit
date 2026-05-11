ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_customer" boolean DEFAULT true NOT NULL;
ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_material" boolean DEFAULT true NOT NULL;
ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_quantity" boolean DEFAULT true NOT NULL;
ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_task_description" boolean DEFAULT true NOT NULL;

