import { ApiRouteError } from "./apiRoute";
/** A stale tab must not submit its persisted request under the new login. */
export function requireStockMovementOperation(
  request: Request,
  companyId: number,
  userId: number
): string {
  if (request.headers.get("X-Werkit-Offline-Owner") !== `${companyId}:${userId}`)
    throw new ApiRouteError("offline_account_mismatch", 409);
  const id = request.headers.get("Idempotency-Key") ?? "";
  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(id)) throw new ApiRouteError("invalid_operation_id", 400);
  return id;
}
