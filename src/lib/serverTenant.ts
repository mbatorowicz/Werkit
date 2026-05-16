import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { isSuperadminRole, resolveTenantCompanyId } from '@/lib/tenantContext';

/** Kontekst firmy dla Server Components (admin / worker). */
export async function requireServerCompanyId(): Promise<number> {
  const session = await getAuthSession();
  if (!session) redirect('/login');
  if (isSuperadminRole(session.role)) redirect('/platform');
  try {
    return await resolveTenantCompanyId(session);
  } catch {
    redirect('/login?reason=tenant');
  }
}
