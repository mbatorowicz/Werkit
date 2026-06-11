import { jsonError, jsonOk, parseJsonBodyOrEmpty, withApiErrorHandling } from "@/lib/apiRoute";
import { coordsFromRequestBody } from "@/lib/coordsFromRequestBody";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";
import { MaterialStockMovementError } from "@/services/materials/MaterialStockMovementError";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import { requireWorkerCompanySession } from "@/lib/apiTenant";

export const POST = withApiErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const { id } = await params;
    const orderId = parsePositiveIntFromString(id);
    if (orderId === null) {
      return jsonError("invalid_id", 400);
    }

    const body = await parseJsonBodyOrEmpty(request);
    const startCoord = coordsFromRequestBody(body);

    const sessionId = await WorkerOrderService.acceptOrder(
      ctx.userId,
      ctx.companyId,
      orderId,
      startCoord
    );
    return jsonOk({ success: true, sessionId });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof Error && err.message === "order_not_found")
        return jsonError("order_not_found", 404);
      if (err instanceof Error && err.message === "not_pending")
        return jsonError("not_pending", 409);
      if (err instanceof Error && err.message === "session_active")
        return jsonError("session_active", 400);
      if (err instanceof Error && err.message === "schedule_conflict")
        return jsonError("schedule_conflict", 409);
      if (err instanceof Error && err.message === "resource_busy")
        return jsonError("resource_busy", 409);
      if (err instanceof MaterialStockMovementError) return jsonError(err.code, 400);
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
