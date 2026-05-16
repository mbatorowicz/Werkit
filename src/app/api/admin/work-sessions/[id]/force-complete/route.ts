import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { AdminSessionService } from '@/services/AdminSessionService';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const POST = withApiErrorHandling(
  async (_request: Request, props: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const params = await props.params;
    const sessionId = parseInt(params.id, 10);
    if (Number.isNaN(sessionId)) return jsonError("invalid_id", 400);

    await AdminSessionService.forceCompleteSession(scoped.data.companyId, sessionId);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "not_found") return jsonError("not_found", 404);
      if (msg === "not_in_progress") return jsonError("not_in_progress", 409);
      return null;
    },
    defaultErrorCode: "save_error",
  },
);
