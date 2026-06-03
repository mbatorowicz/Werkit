-- Scal legacy repair_notes do repair_description, potem usuń kolumnę (notatki z terenu → session_notes).
UPDATE work_orders
SET repair_description = TRIM(
  BOTH FROM CONCAT_WS(
    E'\n\n',
    NULLIF(TRIM(repair_description), ''),
    NULLIF(TRIM(repair_notes), '')
  )
)
WHERE repair_notes IS NOT NULL AND TRIM(repair_notes) <> '';

UPDATE work_sessions
SET repair_description = TRIM(
  BOTH FROM CONCAT_WS(
    E'\n\n',
    NULLIF(TRIM(repair_description), ''),
    NULLIF(TRIM(repair_notes), '')
  )
)
WHERE repair_notes IS NOT NULL AND TRIM(repair_notes) <> '';

ALTER TABLE work_orders DROP COLUMN IF EXISTS repair_notes;
ALTER TABLE work_sessions DROP COLUMN IF EXISTS repair_notes;
