import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from '@/lib/apiRoute';
import { requireSuperadminSession } from '@/lib/apiPlatform';
import { PlatformCompanyService } from '@/services/PlatformCompanyService';
import { hashPassword } from '@/lib/passwordCrypto';
import { parsePositiveIntFromString } from '@/lib/parseRouteParams';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Dodanie administratora do istniejącej organizacji (np. po częściowej nieudanej próbie). */
export const POST = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const companyId = parsePositiveIntFromString((await context.params).id);
    if (companyId == null) return jsonError('invalid_id', 400);

    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company) return jsonError('not_found', 404);

    const body = await parseJsonBody(request);
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const usernameEmail = typeof body.usernameEmail === 'string' ? body.usernameEmail.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!fullName || !usernameEmail || !password.trim()) {
      return jsonError('missing_fields', 400);
    }

    const passwordHash = await hashPassword(password, 10);

    try {
      await PlatformCompanyService.createCompanyAdmin(companyId, {
        fullName,
        usernameEmail,
        passwordHash,
      });
      return jsonOk({ success: true });
    } catch (e: unknown) {
      const code = PlatformCompanyService.mapCreateError(e);
      if (code === 'user_exists') return jsonError('user_exists', 409);
      throw e;
    }
  },
  { defaultErrorCode: 'save_error' },
);
