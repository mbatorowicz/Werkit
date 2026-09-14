import { jsonError } from "@/lib/apiRoute";
import { isPgUniqueViolation } from "@/lib/pgErrors";

/**
 * Mapowanie błędów zapisu użytkownika w API firmy.
 * Unique login (globalny `username_email`) → 400 jak walidacja, bez `user_exists` 500
 * (wyrocznia istnienia konta w innym tenancie).
 */
export function mapAdminUserWriteError(err: unknown) {
  if (err instanceof Error && err.message === "invalid_supervisor") {
    return jsonError("invalid_supervisor", 400);
  }
  if (err instanceof Error && err.message === "invalid_team") {
    return jsonError("invalid_team", 400);
  }
  if (isPgUniqueViolation(err)) {
    return jsonError("invalid_username", 400);
  }
  return null;
}
