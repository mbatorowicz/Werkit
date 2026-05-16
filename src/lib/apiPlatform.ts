import { getAuthSession } from '@/lib/auth';
import { jsonError } from '@/lib/apiRoute';
import { isSuperadminRole } from '@/lib/tenantContext';

export async function requireSuperadminSession(): Promise<
  | { ok: true; userId: number }
  | { ok: false; response: Response }
> {
  const session = await getAuthSession();
  if (!session) {
    return { ok: false, response: jsonError('Unauthorized', 401) };
  }
  if (!isSuperadminRole(session.role)) {
    return { ok: false, response: jsonError('Forbidden', 403) };
  }
  return { ok: true, userId: session.userId };
}
