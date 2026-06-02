-- Powiązanie pobrań/zwrotów części na zleceniu z ruchami magazynowymi

ALTER TABLE stock_issues
  ADD COLUMN IF NOT EXISTS work_order_spare_part_id INTEGER
    REFERENCES work_order_spare_parts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stock_issues_work_order_spare_part_id_uq
  ON stock_issues(work_order_spare_part_id)
  WHERE work_order_spare_part_id IS NOT NULL;

ALTER TABLE stock_receipts
  ADD COLUMN IF NOT EXISTS work_order_spare_part_id INTEGER
    REFERENCES work_order_spare_parts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stock_receipts_work_order_spare_part_id_idx
  ON stock_receipts(work_order_spare_part_id)
  WHERE work_order_spare_part_id IS NOT NULL;
