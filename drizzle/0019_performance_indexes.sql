-- Indeksy wydajnościowe dla kluczowych zapytań
-- AGENTS.md §1a: idempotentne (IF NOT EXISTS / IF NOT EXISTS)

-- work_orders: filtrowanie po firmie + statusie (lista zleceń admin)
CREATE INDEX IF NOT EXISTS idx_work_orders_company_status
  ON work_orders (company_id, status);

-- work_orders: filtrowanie po pracowniku + statusie (lista zleceń worker)
CREATE INDEX IF NOT EXISTS idx_work_orders_user_status
  ON work_orders (user_id, status);

-- work_orders: sortowanie po dacie (kolejność wyświetlania)
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date
  ON work_orders (due_date, created_at);

-- work_sessions: aktywna sesja pracownika (częste zapytanie)
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_status
  ON work_sessions (user_id, company_id, status);

-- work_sessions: historia sesji (sortowanie po dacie zakończenia)
CREATE INDEX IF NOT EXISTS idx_work_sessions_end_time
  ON work_sessions (company_id, user_id, status, end_time DESC);

-- gps_logs: odczyt trasy sesji (częste zapytanie w historii)
CREATE INDEX IF NOT EXISTS idx_gps_logs_session_timestamp
  ON gps_logs (work_session_id, timestamp);

-- device_logs: przeglądanie logów w panelu admina
CREATE INDEX IF NOT EXISTS idx_device_logs_company_created
  ON device_logs (company_id, created_at DESC);

-- device_logs: filtrowanie po poziomie (WARN/ERROR)
CREATE INDEX IF NOT EXISTS idx_device_logs_level
  ON device_logs (company_id, level, created_at DESC);

-- session_photos: zdjęcia sesji (częste złączenie)
CREATE INDEX IF NOT EXISTS idx_session_photos_session
  ON session_photos (work_session_id);

-- session_notes: notatki sesji (częste złączenie)
CREATE INDEX IF NOT EXISTS idx_session_notes_session
  ON session_notes (work_session_id);

-- users: logowanie po username_email (częste zapytanie auth)
CREATE INDEX IF NOT EXISTS idx_users_username_email
  ON users (username_email);

-- resources: filtrowanie po firmie (lista zasobów)
CREATE INDEX IF NOT EXISTS idx_resources_company
  ON resources (company_id);

-- customers: filtrowanie po firmie (lista kontrahentów)
CREATE INDEX IF NOT EXISTS idx_customers_company
  ON customers (company_id);

-- customer_locations: lokalizacje klienta (częste złączenie)
CREATE INDEX IF NOT EXISTS idx_customer_locations_customer
  ON customer_locations (customer_id);

-- materials: filtrowanie po firmie
CREATE INDEX IF NOT EXISTS idx_materials_company
  ON materials (company_id);

-- resource_categories: filtrowanie po firmie
CREATE INDEX IF NOT EXISTS idx_resource_categories_company
  ON resource_categories (company_id);

-- material_categories: filtrowanie po firmie
CREATE INDEX IF NOT EXISTS idx_material_categories_company
  ON material_categories (company_id);
