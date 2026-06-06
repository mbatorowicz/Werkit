-- Magazyn materiałów — stan, PZ/WZ (analogicznie do DUR spare_part_inventory)

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255);

CREATE TABLE IF NOT EXISTS material_inventory (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT '0',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, material_id)
);

CREATE TABLE IF NOT EXISTS material_stock_receipts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2),
  invoice_number VARCHAR(255),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  work_session_id INTEGER REFERENCES work_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS material_stock_issues (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 2) NOT NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  work_session_id INTEGER REFERENCES work_sessions(id) ON DELETE SET NULL,
  issued_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS material_stock_issues_work_session_uidx
  ON material_stock_issues(work_session_id)
  WHERE work_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS material_stock_receipts_work_session_uidx
  ON material_stock_receipts(work_session_id)
  WHERE work_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_inventory_company ON material_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_material_inventory_material ON material_inventory(material_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_receipts_company ON material_stock_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_issues_company ON material_stock_issues(company_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_issues_session ON material_stock_issues(work_session_id);
