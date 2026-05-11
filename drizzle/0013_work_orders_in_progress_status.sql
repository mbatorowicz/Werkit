-- Semantyka statusów zleceń: IN_PROGRESS = przyjęte przez pracownika, trwa sesja (nie mylić z COMPLETED).
-- Backfill dla środowisk, które nadal mają COMPLETED na zleceniu przy aktywnej sesji (stary kod).
UPDATE work_orders wo
SET status = 'IN_PROGRESS'
WHERE wo.status = 'COMPLETED'
  AND EXISTS (
    SELECT 1
    FROM work_sessions ws
    WHERE ws.work_order_id = wo.id
      AND ws.status = 'IN_PROGRESS'
  );
