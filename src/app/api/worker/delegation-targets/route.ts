import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { DelegationScopeService } from "@/services/DelegationScopeService";

export const dynamic = "force-dynamic";

/** GET /api/worker/delegation-targets — podlegli pracownicy dla lidera/kierownika (worker/admin). */
export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { companyId, session } = scoped.data;
    if (session.role !== "worker" && session.role !== "admin") {
      return jsonError("forbidden", 403);
    }

    const actorUserId = session.userId as number;
    const hasRights = await DelegationScopeService.hasDelegationRights(companyId, actorUserId);
    if (!hasRights && session.role !== "admin") {
      return jsonOk([]);
    }

    const workers = await DelegationScopeService.getDelegatableWorkers(
      companyId,
      actorUserId,
      session.role as string
    );
    return jsonOk(workers);
  },
  { defaultErrorCode: "fetch_error" }
);
