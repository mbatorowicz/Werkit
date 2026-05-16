-- Hierarchia grup: parent_id, is_group, sort_order (zlecenia + materiały)

ALTER TABLE "resource_categories"
  ADD COLUMN IF NOT EXISTS "parent_id" integer;

ALTER TABLE "resource_categories"
  ADD COLUMN IF NOT EXISTS "is_group" boolean NOT NULL DEFAULT false;

ALTER TABLE "resource_categories"
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE "resource_categories"
    ADD CONSTRAINT "resource_categories_parent_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "resource_categories"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "material_categories"
  ADD COLUMN IF NOT EXISTS "parent_id" integer;

ALTER TABLE "material_categories"
  ADD COLUMN IF NOT EXISTS "is_group" boolean NOT NULL DEFAULT false;

ALTER TABLE "material_categories"
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE "material_categories"
    ADD CONSTRAINT "material_categories_parent_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "material_categories"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
