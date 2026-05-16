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

/**
 * JWT z companyId albo (legacy) company_id z rekordu użytkownika w DB.
 * Po wdrożeniu multi-firmy stare ciasteczka nie miały companyId w payloadzie.
 */
export async function resolveTenantCompanyId(session: JwtPayload): Promise<number> {
  if (isSuperadminRole(session.role)) {
    throw new TenantContextError('superadmin_no_company', 'Operacja wymaga kontekstu firmy.');
  }

  if (session.companyId != null && session.companyId >= 1) {
    return session.companyId;
  }

  const { AdminUserService } = await import('@/services/AdminUserService');
  const user = await AdminUserService.getUserById(session.userId);
  const fromDb = user?.companyId;
  if (fromDb != null && fromDb >= 1) {
    return fromDb;
  }

  throw new TenantContextError('missing_company', 'Brak przypisania do firmy.');
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
