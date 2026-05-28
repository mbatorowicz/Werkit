-- ============================================================
-- 0021: Typy zleceń, hierarchia organizacyjna, przełącznik GPS
-- ============================================================

-- 1. order_type w resource_categories
ALTER TABLE resource_categories ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) NOT NULL DEFAULT 'machine_work';

-- 2. order_type + repair w work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) NOT NULL DEFAULT 'machine_work';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS repair_description TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS repair_notes TEXT;

-- 3. order_type + repair w work_sessions
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) NOT NULL DEFAULT 'machine_work';
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS repair_description TEXT;
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS repair_notes TEXT;

-- 4. is_dur_worker w users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_dur_worker BOOLEAN NOT NULL DEFAULT false;

-- 5. Flagi funkcji w company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS gps_tracking_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS map_view_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS geofencing_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS route_planning_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS navigation_enabled BOOLEAN NOT NULL DEFAULT true;

-- 6. Tabela: części użyte w zleceniu naprawczym
CREATE TABLE IF NOT EXISTS work_order_spare_parts (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_spare_parts_order ON work_order_spare_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_spare_parts_part ON work_order_spare_parts(part_id);

-- 7. Tabela: działy
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);

-- 8. Tabela: zespoły
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_company ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);

-- 9. Tabela: członkowie zespołów
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
