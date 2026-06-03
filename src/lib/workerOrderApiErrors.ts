/** Kody błędów API zleceń workera (POST/PUT własnych zleceń). */
export const WORKER_ORDER_ERROR_CODES = new Set([
  "forbidden",
  "session_active",
  "schedule_conflict",
  "resource_busy",
  "invalid_category",
  "missing_fields",
  "invalid_payload",
  "invalid_user",
  "missing_customer",
  "missing_material",
  "missing_quantity",
  "missing_task_description",
  "order_not_found",
  "not_pending",
]);

export function workerOrderErrorStatus(code: string): number {
  if (code === "forbidden") return 403;
  if (code === "order_not_found" || code === "not_pending") return 404;
  if (code === "schedule_conflict" || code === "resource_busy") return 409;
  return 400;
}
