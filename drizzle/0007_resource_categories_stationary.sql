ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "is_stationary" boolean DEFAULT false NOT NULL;

UPDATE "resource_categories"
SET "is_stationary" = true
WHERE upper(trim("name")) LIKE '%WARSZTAT%'
   OR upper(trim("name")) LIKE '%WORKSHOP%';
