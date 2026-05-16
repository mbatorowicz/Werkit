import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from '@/lib/apiRoute';
import { requireSuperadminSession } from '@/lib/apiPlatform';
import { PlatformCompanyService } from '@/services/PlatformCompanyService';
import { parsePositiveIntFromString } from '@/lib/parseRouteParams';

export const dynamic = 'force-dynamic';

export const PATCH = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const id = parsePositiveIntFromString((await context.params).id);
    if (id == null) return jsonError('invalid_id', 400);

    const body = await parseJsonBody(request);
    const patch: { name?: string; slug?: string; isActive?: boolean } = {};
    if (typeof body.name === 'string') patch.name = body.name;
    if (typeof body.slug === 'string') patch.slug = body.slug;
    if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;

    try {
      const row = await PlatformCompanyService.updateCompany(id, patch);
      if (!row) return jsonError('not_found', 404);
      return jsonOk({ success: true, company: row });
    } catch (e: unknown) {
      const dup =
        typeof e === 'object' && e !== null && 'code' in e && (e as { code?: unknown }).code === '23505';
      if (dup) return jsonError('slug_exists', 409);
      throw e;
    }
  },
  { defaultErrorCode: 'save_error' },
);
