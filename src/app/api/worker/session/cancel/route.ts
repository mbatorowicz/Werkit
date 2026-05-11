import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { getUserId } from '@/lib/auth';
import { WorkerSessionService } from '@/services/WorkerSessionService';

export const POST = withApiErrorHandling(
  async () => {
    const userId = await getUserId();
    if (!userId) return jsonError("Unauthorized", 401);

    await WorkerSessionService.cancelActiveSession(userId);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => (err instanceof Error && err.message === "no_active_session" ? jsonError("no_active_session", 404) : null),
    defaultErrorCode: "save_error",
  },
);
