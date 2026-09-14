/**
 * Błędy PostgreSQL w łańcuchu `cause`.
 * Drizzle opakowuje błąd drivera w `DrizzleQueryError` — kod `23505` nie jest na wierzchu.
 */

export function findPgUniqueViolation(err: unknown): { message: string } | null {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (candidate.code === "23505") {
      return {
        message: typeof candidate.message === "string" ? candidate.message : String(err),
      };
    }
    current = candidate.cause;
  }
  return null;
}

export function isPgUniqueViolation(err: unknown): boolean {
  return findPgUniqueViolation(err) != null;
}
