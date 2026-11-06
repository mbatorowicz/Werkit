import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { WorkerSessionService } from "@/services/WorkerSessionService";
import { requireWorkerCompanySession } from "@/lib/apiTenant";

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const body = await parseJsonBody(request);
    await WorkerSessionService.cancelActiveSession(
      ctx.userId,
      ctx.companyId,
      typeof body.sessionId === "number" ? body.sessionId : undefined
    );
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) =>
      err instanceof Error && err.message === "no_active_session"
        ? jsonError("no_active_session", 404)
        : null,
    defaultErrorCode: "save_error",
  }
);
