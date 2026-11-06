import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { OfflineOperationService } from "@/services/OfflineOperationService";

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;
    return jsonOk(
      await OfflineOperationService.execute(ctx.userId, ctx.companyId, await parseJsonBody(request))
    );
  },
  {
    mapUnknownError: (error) =>
      error instanceof Error &&
      [
        "offline_conflict",
        "invalid_payload",
        "invalid_photo_data",
        "note_too_long",
        "photo_required",
        "cancel_window_expired",
        "session_has_parts",
      ].includes(error.message)
        ? jsonError(error.message, 409)
        : null,
  }
);
