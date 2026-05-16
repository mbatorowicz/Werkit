import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { WorkerSessionService } from '@/services/WorkerSessionService';
import { requireWorkerCompanySession } from '@/lib/apiTenant';

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const body = await parseJsonBody(request);
    const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl : "";
    const location = body.location as { lat?: unknown; lng?: unknown } | undefined;
    if (!photoUrl.trim()) return jsonError("missing_fields", 400);

    await WorkerSessionService.addPhoto(
      ctx.userId,
      ctx.companyId,
      photoUrl,
      location?.lat != null ? String(location.lat) : null,
      location?.lng != null ? String(location.lng) : null,
    );

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => (err instanceof Error && err.message === "no_active_session" ? jsonError("no_active_session", 400) : null),
    defaultErrorCode: "save_error",
  },
);
