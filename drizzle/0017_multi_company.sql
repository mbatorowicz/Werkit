-- Multi-tenant: firmy (tenants) + company_id na danych operacyjnych.
-- Istniejące dane → firma domyślna id=1.

CREATE TABLE IF NOT EXISTS companies (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO companies (id, name, slug, is_active)
VALUES (1, 'Werkit — migracja', 'default', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('companies', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM companies), 1)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE RESTRICT;
UPDATE users SET company_id = 1 WHERE company_id IS NULL;

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE company_settings SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE company_settings ALTER COLUMN company_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_company_id_unique ON company_settings (company_id);

ALTER TABLE resource_categories ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE resource_categories SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE resource_categories ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS resource_categories_company_id_idx ON resource_categories (company_id);

ALTER TABLE resources ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE resources SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE resources ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS resources_company_id_idx ON resources (company_id);

ALTER TABLE material_categories ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE material_categories SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE material_categories ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS material_categories_company_id_idx ON material_categories (company_id);

ALTER TABLE materials ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE materials SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE materials ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS materials_company_id_idx ON materials (company_id);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE customers SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS customers_company_id_idx ON customers (company_id);

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE work_orders SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE work_orders ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS work_orders_company_id_idx ON work_orders (company_id);

ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE work_sessions SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE work_sessions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS work_sessions_company_id_idx ON work_sessions (company_id);

ALTER TABLE device_logs ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE device_logs SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE device_logs ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS device_logs_company_id_idx ON device_logs (company_id);

CREATE INDEX IF NOT EXISTS users_company_id_idx ON users (company_id);
