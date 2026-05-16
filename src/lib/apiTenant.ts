import { getAuthSession, type JwtPayload } from '@/lib/auth';
import { jsonError } from '@/lib/apiRoute';
import { getTenantCompanyId, isSuperadminRole } from '@/lib/tenantContext';

export type CompanyScopedSession = {
  session: JwtPayload;
  companyId: number;
};

export async function requireWorkerCompanySession(): Promise<
  | { ok: true; userId: number; companyId: number; session: JwtPayload }
  | { ok: false; response: Response }
> {
  const session = await getAuthSession();
  if (!session?.userId) {
    return { ok: false, response: jsonError('Unauthorized', 401) };
  }
  try {
    return {
      ok: true,
      userId: session.userId,
      companyId: getTenantCompanyId(session),
      session,
    };
  } catch {
    return { ok: false, response: jsonError('Forbidden', 403) };
  }
}

export async function requireCompanyScopedSession():
  Promise<{ ok: true; data: CompanyScopedSession } | { ok: false; response: Response }> {
  const session = await getAuthSession();
  if (!session) {
    return { ok: false, response: jsonError('Unauthorized', 401) };
  }
  if (isSuperadminRole(session.role)) {
    return { ok: false, response: jsonError('Forbidden', 403) };
  }
  try {
    return { ok: true, data: { session, companyId: getTenantCompanyId(session) } };
  } catch {
    return { ok: false, response: jsonError('Forbidden', 403) };
  }
}
