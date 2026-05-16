import type { JwtPayload } from '@/lib/auth';

export type UserRole = 'superadmin' | 'admin' | 'worker' | 'viewer';

export function isSuperadminRole(role: string): boolean {
  return role === 'superadmin';
}

export function isCompanyScopedRole(role: string): boolean {
  return role === 'admin' || role === 'worker' || role === 'viewer';
}

/** Wymaga kontekstu firmy (admin / worker / viewer z JWT). */
export function getTenantCompanyId(session: JwtPayload): number {
  if (isSuperadminRole(session.role)) {
    throw new TenantContextError('superadmin_no_company', 'Operacja wymaga kontekstu firmy.');
  }
  const companyId = session.companyId;
  if (companyId == null || companyId < 1) {
    throw new TenantContextError('missing_company', 'Brak przypisania do firmy.');
  }
  return companyId;
}

export class TenantContextError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TenantContextError';
  }
}
