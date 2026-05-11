ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "start_latitude" numeric(10, 8);
ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "start_longitude" numeric(11, 8);
ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "end_latitude" numeric(10, 8);
ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "end_longitude" numeric(11, 8);
