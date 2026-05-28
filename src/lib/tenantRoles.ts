/**
 * Czyste funkcje roli — bez importu `@/db`.
 * Mogą być bezpiecznie używane w Edge middleware (proxy.ts).
 */
export type UserRole = 'superadmin' | 'admin' | 'worker' | 'viewer';

export function isSuperadminRole(role: string): boolean {
  return role === 'superadmin';
}

export function isCompanyScopedRole(role: string): boolean {
  return role === 'admin' || role === 'worker' || role === 'viewer';
}
