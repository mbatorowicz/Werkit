/**
 * Czyste funkcje roli — bez importu `@/db`.
 * Mogą być bezpiecznie używane w Edge middleware (proxy.ts).
 */
export type UserRole = "superadmin" | "admin" | "worker" | "viewer";

export function isSuperadminRole(role: string): boolean {
  return role === "superadmin";
}

export function isCompanyScopedRole(role: string): boolean {
  return role === "admin" || role === "worker" || role === "viewer";
}

/**
 * Query `reason` na `/login`, przy którym Edge musi skasować `auth_token`.
 * `tenant` — brak firmy w JWT; `session` — martwy principal (konto/firma z DB).
 * Nagłówek `X-Forwarded-For` nie jest tu używany i nie może sterować auth.
 */
export function isAuthCookieClearLoginReason(reason: string | null): boolean {
  return reason === "tenant" || reason === "session";
}
