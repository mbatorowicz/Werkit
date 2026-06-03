import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { isMissingWorkOrderRepairColumns } from "@/lib/postgresMigrationHints";
import {
  WORKER_ORDER_ERROR_CODES,
  workerOrderErrorStatus,
} from "@/lib/workerOrderApiErrors";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import { requireWorkerCompanySession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

function parseOrderId(request: Request): number | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const idSegment = segments[segments.length - 1];
  const id = parseInt(idSegment, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function mapWorkerOrderDomainError(err: unknown) {
  if (err instanceof Error && err.message === "forbidden") {
    return jsonError("forbidden", 403);
  }
  if (err instanceof Error && WORKER_ORDER_ERROR_CODES.has(err.message)) {
    return jsonError(err.message, workerOrderErrorStatus(err.message));
  }
  if (isMissingWorkOrderRepairColumns(err)) {
    console.error(
      "[worker/work-orders/[id]] Brak kolumn order_type / repair_* — uruchom migracje Drizzle."
    );
    return jsonError("save_error", 503);
  }
  if (err instanceof Error) {
    console.error("[worker/work-orders/[id]]:", err.message);
  }
  return null;
}

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const orderId = parseOrderId(request);
    if (orderId == null) return jsonError("invalid_id", 400);

    const order = await WorkerOrderService.getOwnPendingOrder(
      ctx.userId,
      ctx.companyId,
      orderId
    );
    return jsonOk(order);
  },
  {
    mapUnknownError: mapWorkerOrderDomainError,
    defaultErrorCode: "fetch_error",
  }
);

export const PUT = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const orderId = parseOrderId(request);
    if (orderId == null) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    await WorkerOrderService.updateOwnOrder(ctx.userId, ctx.companyId, orderId, body);
    return jsonOk({ ok: true });
  },
  {
    mapUnknownError: mapWorkerOrderDomainError,
    defaultErrorCode: "save_error",
  }
);

export const DELETE = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const orderId = parseOrderId(request);
    if (orderId == null) return jsonError("invalid_id", 400);

    await WorkerOrderService.deleteOwnOrder(ctx.userId, ctx.companyId, orderId);
    return jsonOk({ ok: true });
  },
  {
    mapUnknownError: mapWorkerOrderDomainError,
    defaultErrorCode: "delete_error",
  }
);
