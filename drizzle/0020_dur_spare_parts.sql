-- Moduł DUR (Dział Utrzymania Ruchu) — magazyn części zamiennych
-- Faza 1: katalog części, kategorie, kompatybilność z kategoriami maszyn

-- Kategorie części zamiennych (hierarchiczne)
CREATE TABLE IF NOT EXISTS spare_part_categories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES spare_part_categories(id) ON DELETE SET NULL,
  is_group BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(50) DEFAULT '#3f3f46'
);

-- Części zamienne
CREATE TABLE IF NOT EXISTS spare_parts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  catalog_number VARCHAR(255) NOT NULL DEFAULT '',
  manufacturer VARCHAR(255) NOT NULL DEFAULT '',
  unit VARCHAR(50) NOT NULL DEFAULT 'szt',
  purchase_price NUMERIC(10,2),
  description TEXT,
  min_stock NUMERIC(10,2) NOT NULL DEFAULT '0',
  location VARCHAR(255) NOT NULL DEFAULT '',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Przypisanie części do kategorii części (N:M)
CREATE TABLE IF NOT EXISTS spare_part_to_categories (
  part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES spare_part_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (part_id, category_id)
);

-- Kompatybilność części z kategoriami maszyn (N:M)
CREATE TABLE IF NOT EXISTS spare_part_machine_compatibility (
  part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES resource_categories(id) ON DELETE CASCADE,
  notes VARCHAR(255),
  PRIMARY KEY (part_id, category_id)
);

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_spare_parts_company ON spare_parts(company_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_categories_company ON spare_part_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_to_categories_part ON spare_part_to_categories(part_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_to_categories_category ON spare_part_to_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_machine_compatibility_part ON spare_part_machine_compatibility(part_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_machine_compatibility_category ON spare_part_machine_compatibility(category_id);
