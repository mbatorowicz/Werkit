-- PL2: cykl życia firmy + szablon pakietu (control plane).
-- Idempotentne: ADD COLUMN IF NOT EXISTS / DROP+ADD CHECK.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(16) NOT NULL DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_note TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_key VARCHAR(32);

-- Istniejące is_active=false → suspended (nie archived). Login S0 nadal stoi na is_active.
UPDATE companies
SET lifecycle_status = 'suspended'
WHERE is_active = false
  AND lifecycle_status IS DISTINCT FROM 'archived';

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_lifecycle_status_chk;
ALTER TABLE companies ADD CONSTRAINT companies_lifecycle_status_chk
  CHECK (lifecycle_status IN ('trial', 'active', 'suspended', 'archived'));

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_plan_key_chk;
ALTER TABLE companies ADD CONSTRAINT companies_plan_key_chk
  CHECK (plan_key IS NULL OR plan_key IN ('field_ops', 'field_ops_mro', 'yard', 'custom'));
