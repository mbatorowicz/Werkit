-- Utworzenie rozszerzenia PostGIS dla funkcji geoprzestrzennych
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"username_email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'worker' NOT NULL,
	"device_unique_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_username_email_unique" UNIQUE("username_email")
);

CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL
);

CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL
);

CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255) NOT NULL,
	"default_address" text
);

CREATE TABLE "work_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"session_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'IN_PROGRESS' NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"quantity_tons" numeric(10, 2),
	"material_id" integer,
	"customer_id" integer,
	"task_description" text,
	"machine_hours_photo_url" text,
	"signature_url" text,
	"client_absent" boolean DEFAULT false,
	CONSTRAINT "work_sessions_user_id_fkey" FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "work_sessions_resource_id_fkey" FOREIGN KEY("resource_id") REFERENCES "resources"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "work_sessions_material_id_fkey" FOREIGN KEY("material_id") REFERENCES "materials"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "work_sessions_customer_id_fkey" FOREIGN KEY("customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE "session_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_session_id" integer NOT NULL,
	"photo_url" text NOT NULL,
	"photo_type" varchar(50) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_photos_work_session_id_fkey" FOREIGN KEY("work_session_id") REFERENCES "work_sessions"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "gps_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_session_id" integer NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gps_logs_work_session_id_fkey" FOREIGN KEY("work_session_id") REFERENCES "work_sessions"("id") ON DELETE cascade ON UPDATE no action
);
