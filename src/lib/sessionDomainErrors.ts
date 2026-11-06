import { jsonError } from "./apiRoute";
const codes = new Set([
  "photo_required",
  "cancel_window_expired",
  "session_has_parts",
  "order_has_history",
  "invalid_category",
  "missing_customer",
  "missing_material",
  "missing_quantity",
  "missing_task_description",
  "invalid_payload",
  "missing_fields",
  "not_pending",
  "forbidden",
]);
export function mapSessionDomainError(error: unknown) {
  if (!(error instanceof Error) || !codes.has(error.message)) return null;
  return jsonError(error.message, error.message === "forbidden" ? 403 : 409);
}
