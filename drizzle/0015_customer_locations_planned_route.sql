CREATE TABLE IF NOT EXISTS "customer_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "label" varchar(255) NOT NULL DEFAULT 'Główna',
  "address" text,
  "latitude" numeric(10, 8) NOT NULL,
  "longitude" numeric(11, 8) NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "route_waypoints" jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS "customer_locations_customer_id_idx" ON "customer_locations" ("customer_id");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_edit_route" boolean NOT NULL DEFAULT false;

ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "customer_location_id" integer REFERENCES "customer_locations"("id") ON DELETE SET NULL;

INSERT INTO "customer_locations" ("customer_id", "label", "address", "latitude", "longitude", "is_default", "sort_order")
SELECT c."id", 'Główna', c."default_address", c."latitude", c."longitude", true, 0
FROM "customers" c
WHERE c."latitude" IS NOT NULL
  AND c."longitude" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "customer_locations" cl WHERE cl."customer_id" = c."id"
  );

UPDATE "work_orders" wo
SET "customer_location_id" = cl."id"
FROM "customer_locations" cl
WHERE wo."customer_id" = cl."customer_id"
  AND cl."is_default" = true
  AND wo."customer_location_id" IS NULL;
