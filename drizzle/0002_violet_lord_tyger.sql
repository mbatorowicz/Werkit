CREATE TABLE "device_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"level" varchar(20) DEFAULT 'INFO' NOT NULL,
	"message" text NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_to_categories" (
	"resource_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_categories" ADD COLUMN "req_customer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD COLUMN "req_material" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD COLUMN "req_quantity" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD COLUMN "req_task_description" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD COLUMN "is_global" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD COLUMN "color" varchar(50) DEFAULT '#3f3f46';--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "device_logs" ADD CONSTRAINT "device_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_categories" ADD CONSTRAINT "resource_to_categories_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_categories" ADD CONSTRAINT "resource_to_categories_category_id_resource_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."resource_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_category_id_resource_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."resource_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_category_id_resource_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."resource_categories"("id") ON DELETE set null ON UPDATE no action;