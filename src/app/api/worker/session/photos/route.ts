import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { getUserId } from '@/lib/auth';
import { WorkerSessionService } from '@/services/WorkerSessionService';

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const userId = await getUserId();
    if (!userId) return jsonError("Unauthorized", 401);

    const body = await parseJsonBody(request);
    const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl : "";
    const location = body.location as { lat?: unknown; lng?: unknown } | undefined;
    if (!photoUrl.trim()) return jsonError("missing_fields", 400);

    await WorkerSessionService.addPhoto(
      userId,
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
