import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { AdminDispatchService } from "@/services/AdminDispatchService";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

/** GET /api/admin/dispatch/live — zlecenia PENDING + sesje IN_PROGRESS (polling). */
export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const data = await AdminDispatchService.getLiveData(scoped.data.companyId);
    return jsonOk(data);
  },
  { defaultErrorCode: "fetch_error" }
);
