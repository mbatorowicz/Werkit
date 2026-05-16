import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { WorkerSessionService } from '@/services/WorkerSessionService';
import { requireWorkerCompanySession } from '@/lib/apiTenant';

export const POST = withApiErrorHandling(
  async () => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    await WorkerSessionService.cancelActiveSession(ctx.userId, ctx.companyId);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => (err instanceof Error && err.message === "no_active_session" ? jsonError("no_active_session", 404) : null),
    defaultErrorCode: "save_error",
  },
);
