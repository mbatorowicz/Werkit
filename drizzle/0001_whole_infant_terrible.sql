ALTER TABLE "company_settings" ADD COLUMN "upcoming_order_reminder_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "can_create_own_orders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD COLUMN "work_order_id" integer;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;