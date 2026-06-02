-- Grupy maszyn (typy zasobów, np. „Kapsułkarka 02A”) — osobno od kategorii zleceń (resource_categories).

CREATE TABLE IF NOT EXISTS resource_groups (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_resource_groups_company ON resource_groups(company_id);

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS resource_group_id INTEGER REFERENCES resource_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_resource_group ON resources(resource_group_id);

-- Kompatybilność części: FK na resource_groups zamiast resource_categories (kategorie zleceń).
DELETE FROM spare_part_machine_compatibility;

ALTER TABLE spare_part_machine_compatibility
  DROP CONSTRAINT IF EXISTS spare_part_machine_compatibility_category_id_resource_categories_id_fk;

ALTER TABLE spare_part_machine_compatibility
  DROP CONSTRAINT IF EXISTS spare_part_machine_compatibility_category_id_fkey;

ALTER TABLE spare_part_machine_compatibility
  RENAME COLUMN category_id TO resource_group_id;

ALTER TABLE spare_part_machine_compatibility
  ADD CONSTRAINT spare_part_machine_compatibility_resource_group_id_fkey
  FOREIGN KEY (resource_group_id) REFERENCES resource_groups(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_spare_part_machine_compatibility_category;
CREATE INDEX IF NOT EXISTS idx_spare_part_machine_compatibility_group
  ON spare_part_machine_compatibility(resource_group_id);
