-- Normalizacja starych / błędnych wartości przed CHECK
UPDATE "work_orders"
SET "priority" = 'NORMAL'
WHERE "priority" IS NOT NULL
  AND "priority" NOT IN ('URGENT', 'HIGH', 'NORMAL', 'LOW');
--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_priority_chk" CHECK ("priority" IN ('URGENT', 'HIGH', 'NORMAL', 'LOW'));
