import { db } from '@/db';
import { resources, materials, customers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

// --- Generic entity-company assertion ---

type EntityTable = { id: unknown; companyId: unknown };
type EntityName = 'resource' | 'material' | 'customer';

const entityConfig: Record<EntityName, { table: EntityTable; label: string }> = {
  resource: { table: resources, label: 'Zasób' },
  material: { table: materials, label: 'Materiał' },
  customer: { table: customers, label: 'Klient' },
};

async function assertEntityBelongsToCompany(
  entityName: EntityName,
  entityId: number,
  companyId: number,
): Promise<void> {
  const cfg = entityConfig[entityName];
  const [row] = await db
    .select({ id: (cfg.table as typeof resources).id })
    .from(cfg.table as typeof resources)
    .where(and(eq((cfg.table as typeof resources).id, entityId), eq((cfg.table as typeof resources).companyId, companyId)))
    .limit(1);
  if (!row) {
    throw new TenantContextError('cross_tenant', `${cfg.label} nie należy do tej firmy.`);
  }
}

/** Sprawdza czy zasób o podanym ID należy do firmy. */
export function assertResourceBelongsToCompany(resourceId: number, companyId: number): Promise<void> {
  return assertEntityBelongsToCompany('resource', resourceId, companyId);
}

/** Sprawdza czy materiał o podanym ID należy do firmy. */
export function assertMaterialBelongsToCompany(materialId: number, companyId: number): Promise<void> {
  return assertEntityBelongsToCompany('material', materialId, companyId);
}

/** Sprawdza czy klient o podanym ID należy do firmy. */
export function assertCustomerBelongsToCompany(customerId: number, companyId: number): Promise<void> {
  return assertEntityBelongsToCompany('customer', customerId, companyId);
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
