import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { getTenantCompanyId, isSuperadminRole } from '@/lib/tenantContext';

/** Kontekst firmy dla Server Components (admin / worker). */
export async function requireServerCompanyId(): Promise<number> {
  const session = await getAuthSession();
  if (!session) redirect('/login');
  if (isSuperadminRole(session.role)) redirect('/platform');
  try {
    return getTenantCompanyId(session);
  } catch {
    redirect('/login');
  }
}
