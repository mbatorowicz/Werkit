-- Indeksy pod lazy-load archiwum dyspozycji (sortowanie po start_time w firmie)
CREATE INDEX IF NOT EXISTS idx_work_sessions_company_start_time
  ON work_sessions (company_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_work_sessions_company_in_progress
  ON work_sessions (company_id, start_time DESC)
  WHERE status = 'IN_PROGRESS';
