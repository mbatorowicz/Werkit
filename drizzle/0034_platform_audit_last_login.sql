-- PL0: last_login_at + dziennik mutacji panelu platformy (control plane).
-- Idempotentne: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS platform_audit_events (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32),
  target_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_events_company_created
  ON platform_audit_events (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_events_actor_created
  ON platform_audit_events (actor_user_id, created_at DESC);
