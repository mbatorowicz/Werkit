import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { isMissingWorkOrderRepairColumns } from "@/lib/postgresMigrationHints";
import { WORKER_ORDER_ERROR_CODES, workerOrderErrorStatus } from "@/lib/workerOrderApiErrors";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import { requireWorkerCompanySession } from "@/lib/apiTenant";

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
      if (err instanceof Error && err.message === "forbidden") {
        return jsonError("forbidden", 403);
      }
      if (err instanceof Error && WORKER_ORDER_ERROR_CODES.has(err.message)) {
        return jsonError(err.message, workerOrderErrorStatus(err.message));
      }
      if (isMissingWorkOrderRepairColumns(err)) {
        console.error(
          "[worker/work-orders] Brak kolumn order_type / repair_* — uruchom migracje Drizzle."
        );
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
