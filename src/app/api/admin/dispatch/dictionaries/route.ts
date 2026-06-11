import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { AdminDispatchService } from "@/services/AdminDispatchService";
import { DelegationScopeService } from "@/services/DelegationScopeService";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

/** GET /api/admin/dispatch/dictionaries — słowniki dyspozycji (rzadszy polling). */
export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { companyId, session } = scoped.data;
    const actorUserId = session.userId as number;
    const actorRole = session.role as string;
    const canMutate = actorRole === "admin";
    const hasDelegation = await DelegationScopeService.hasDelegationRights(companyId, actorUserId);
    const scopedWorkers = !canMutate && hasDelegation;

    const data = await AdminDispatchService.getDictionaries({
      companyId,
      actorUserId,
      actorRole,
      scopedWorkers,
    });
    return jsonOk(data);
  },
  { defaultErrorCode: "fetch_error" }
);
