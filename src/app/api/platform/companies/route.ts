import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from '@/lib/apiRoute';
import { requireSuperadminSession } from '@/lib/apiPlatform';
import { PlatformCompanyService } from '@/services/PlatformCompanyService';
import { hashPassword } from '@/lib/passwordCrypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  const adminName = typeof body.adminFullName === 'string' ? body.adminFullName.trim() : '';
  const adminEmail = typeof body.adminEmail === 'string' ? body.adminEmail.trim().toLowerCase() : '';
  const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : '';

  if (!name.trim()) return jsonError('missing_name', 400);

  const wantsAdmin = Boolean(adminName && adminEmail && adminPassword.trim());
  if ((adminEmail || adminName) && !wantsAdmin) {
    return jsonError('missing_fields', 400);
  }

  let passwordHash: string | null = null;
  if (wantsAdmin) {
    passwordHash = await hashPassword(adminPassword, 10);
  }

  try {
    const company = await PlatformCompanyService.createCompanyWithAdmin(
      name,
      slug,
      wantsAdmin && passwordHash
        ? { fullName: adminName, usernameEmail: adminEmail, passwordHash }
        : null,
    );

    return jsonOk({ success: true, company });
  } catch (e: unknown) {
    const code = PlatformCompanyService.mapCreateError(e);
    if (code) return jsonError(code, 409);
    throw e;
  }
}, { defaultErrorCode: 'save_error' });
