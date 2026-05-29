-- ============================================================
-- 0023: Feature flag dla modułu DUR (części zamienne, magazyn)
-- ============================================================

-- 1. dur_enabled w company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS dur_enabled BOOLEAN NOT NULL DEFAULT false;
