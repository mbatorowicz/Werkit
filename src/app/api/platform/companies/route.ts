import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from '@/lib/apiRoute';
import { requireSuperadminSession } from '@/lib/apiPlatform';
import { PlatformCompanyService } from '@/services/PlatformCompanyService';
import { hashPassword } from '@/lib/passwordCrypto';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const auth = await requireSuperadminSession();
  if (!auth.ok) return auth.response;

  const rows = await PlatformCompanyService.listCompanies();
  return jsonOk(rows);
}, { defaultErrorCode: 'fetch_error' });

export const POST = withApiErrorHandling(async (request: Request) => {
  const auth = await requireSuperadminSession();
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  const name = typeof body.name === 'string' ? body.name : '';
  const slug = typeof body.slug === 'string' ? body.slug : undefined;

  const adminName = typeof body.adminFullName === 'string' ? body.adminFullName : '';
  const adminEmail = typeof body.adminEmail === 'string' ? body.adminEmail : '';
  const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : '';

  if (!name.trim()) return jsonError('missing_name', 400);

  try {
    const company = await PlatformCompanyService.createCompany(name, slug);

    if (adminEmail.trim() && adminPassword.trim() && adminName.trim()) {
      const passwordHash = await hashPassword(adminPassword, 10);
      await PlatformCompanyService.createCompanyAdmin(company.id, {
        fullName: adminName,
        usernameEmail: adminEmail,
        passwordHash,
      });
    }

    return jsonOk({ success: true, company });
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e && (e as { code?: unknown }).code === '23505'
        ? 'slug_exists'
        : null;
    if (code) return jsonError(code, 409);
    throw e;
  }
}, { defaultErrorCode: 'save_error' });
