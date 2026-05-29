-- Moduł DUR (Dział Utrzymania Ruchu) — Faza 2: Gospodarka magazynowa
-- Tabele: spare_part_inventory, stock_receipts, stock_issues

-- Stan magazynowy części (1:1 z spare_parts)
CREATE TABLE IF NOT EXISTS spare_part_inventory (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT '0',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, part_id)
);

-- Przyjęcia magazynowe
CREATE TABLE IF NOT EXISTS stock_receipts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2),
  invoice_number VARCHAR(255),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wydania magazynowe
CREATE TABLE IF NOT EXISTS stock_issues (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  issued_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_spare_part_inventory_company ON spare_part_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_inventory_part ON spare_part_inventory(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_company ON stock_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_part ON stock_receipts(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_issues_company ON stock_issues(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_issues_part ON stock_issues(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_issues_work_order ON stock_issues(work_order_id);
