import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { isMissingWorkOrderRepairColumns } from "@/lib/postgresMigrationHints";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import { requireWorkerCompanySession } from "@/lib/apiTenant";

/** Kody błędów domenowych (nie surowy komunikat Postgresa). */
const WORKER_ORDER_ERROR_CODES = new Set([
  "forbidden",
  "session_active",
  "schedule_conflict",
  "resource_busy",
  "invalid_category",
  "missing_fields",
  "invalid_payload",
  "invalid_user",
  "missing_customer",
  "missing_material",
  "missing_quantity",
  "missing_task_description",
]);

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const url = new URL(request.url);
    const offsetParam = url.searchParams.get("offset");
    const limitParam = url.searchParams.get("limit");
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;
    const limit = limitParam ? Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50)) : 50;

    const orders = await WorkerOrderService.getPendingOrders(ctx.userId, ctx.companyId, {
      offset,
      limit,
    });
    return jsonOk(orders);
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const body = await parseJsonBody(request);

    const orderId = await WorkerOrderService.createOwnOrder(ctx.userId, ctx.companyId, body);

    return jsonOk({ orderId });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof Error && err.message === "forbidden") return jsonError("Forbidden", 403);
      if (err instanceof Error && WORKER_ORDER_ERROR_CODES.has(err.message)) {
        const status =
          err.message === "schedule_conflict" || err.message === "resource_busy" ? 409 : 400;
        return jsonError(err.message, status);
      }
      if (isMissingWorkOrderRepairColumns(err)) {
        console.error("[worker/work-orders] Brak kolumn order_type / repair_* — uruchom migracje Drizzle.");
        return jsonError("save_error", 503);
      }
      if (err instanceof Error) {
        console.error("[worker/work-orders] createOwnOrder:", err.message);
      }
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
