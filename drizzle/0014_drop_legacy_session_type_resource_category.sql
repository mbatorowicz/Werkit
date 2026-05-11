-- Faza C: usuń legacy — semantyka jest na `work_sessions.category_id` / `resource_to_categories`.
ALTER TABLE work_sessions DROP COLUMN IF EXISTS session_type;
ALTER TABLE work_orders DROP COLUMN IF EXISTS session_type;
ALTER TABLE resources DROP COLUMN IF EXISTS category_id;
