import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { isMissingWorkOrderRepairColumns } from "@/lib/postgresMigrationHints";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { WorkerDelegationService } from "@/services/WorkerDelegationService";
import { DelegationScopeService } from "@/services/DelegationScopeService";

export const dynamic = "force-dynamic";

/** POST /api/worker/delegations — lider/kierownik tworzy zlecenie PENDING dla podległego. */
export const POST = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { companyId, session } = scoped.data;
    const actorUserId = session.userId as number;
    const actorRole = session.role as string;

    if (actorRole !== "worker" && actorRole !== "admin") {
      return jsonError("forbidden", 403);
    }

    const hasRights =
      actorRole === "admin" ||
      (await DelegationScopeService.hasDelegationRights(companyId, actorUserId));
    if (!hasRights) {
      return jsonError("forbidden", 403);
    }

    const body = await parseJsonBody(request);
    const orderId = await WorkerDelegationService.createDelegatedOrder(
      actorUserId,
      actorRole,
      companyId,
      body
    );
    return jsonOk({ success: true, orderId }, { status: 201 });
  },
  {
    mapUnknownError: (err) => {
      if (isMissingWorkOrderRepairColumns(err)) {
        return jsonError("save_error", 503);
      }
      if (err instanceof Error) {
        if (err.message === "forbidden") return jsonError("forbidden", 403);
        if (err.message === "missing_fields") return jsonError("missing_fields", 400);
        if (err.message === "invalid_payload") return jsonError("invalid_payload", 400);
        if (err.message === "schedule_conflict" || err.message === "resource_busy") {
          return jsonError(err.message, 409);
        }
      }
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
