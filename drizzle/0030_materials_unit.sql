ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "unit" varchar(50) NOT NULL DEFAULT 't';

UPDATE "materials" SET "unit" = 't' WHERE "unit" IS NULL OR trim("unit") = '';
