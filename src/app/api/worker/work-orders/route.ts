import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
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
      if (err instanceof Error && err.message === "forbidden") return jsonError("Forbidden", 403);
      if (err instanceof Error && err.message === "session_active")
        return jsonError("session_active", 400);
      if (err instanceof Error && err.message === "schedule_conflict")
        return jsonError("schedule_conflict", 409);
      if (err instanceof Error && err.message === "resource_busy")
        return jsonError("resource_busy", 409);
      if (err instanceof Error && err.message === "invalid_category")
        return jsonError("invalid_category", 400);
      if (err instanceof Error && err.message === "missing_fields")
        return jsonError("missing_fields", 400);
      if (err instanceof Error && err.message === "invalid_payload")
        return jsonError("invalid_payload", 400);
      if (err instanceof Error && err.message !== "ok") return jsonError(err.message, 400);
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
