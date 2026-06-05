import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { DelegationScopeService } from "@/services/DelegationScopeService";

export const dynamic = "force-dynamic";

/** GET /api/admin/users/delegatable — pracownicy w zasięgu delegowania aktora. */
export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { companyId, session } = scoped.data;
    const actorUserId = session.userId as number;
    const actorRole = session.role as string;

    const workers = await DelegationScopeService.getDelegatableWorkers(
      companyId,
      actorUserId,
      actorRole
    );
    return jsonOk(workers);
  },
  { defaultErrorCode: "fetch_error" }
);
