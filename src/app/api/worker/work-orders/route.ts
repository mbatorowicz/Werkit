import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { coerceWorkOrderPriority } from '@/lib/workOrderCategoryValidation';
import { WorkerOrderService } from '@/services/WorkerOrderService';
import { requireWorkerCompanySession } from '@/lib/apiTenant';
import { parsePositiveIntParam } from '@/lib/parseRouteParams';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const orders = await WorkerOrderService.getPendingOrders(ctx.userId, ctx.companyId);
  return jsonOk(orders);
}, { defaultErrorCode: "fetch_error" });

export const POST = withApiErrorHandling(async (request: Request) => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const body = await parseJsonBody(request);

  const categoryId = parsePositiveIntParam(body.categoryId);
  const resourceId = parsePositiveIntParam(body.resourceId);
  if (categoryId == null || resourceId == null) {
    return jsonError("missing_fields", 400);
  }

  const materialId =
    body.materialId != null && body.materialId !== ""
      ? parsePositiveIntParam(body.materialId)
      : null;
  const customerId =
    body.customerId != null && body.customerId !== ""
      ? parsePositiveIntParam(body.customerId)
      : null;
  if (body.materialId != null && body.materialId !== "" && materialId == null) {
    return jsonError("invalid_payload", 400);
  }
  if (body.customerId != null && body.customerId !== "" && customerId == null) {
    return jsonError("invalid_payload", 400);
  }

  const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : null;
  const quantityTons =
    typeof body.quantityTons === "string" || typeof body.quantityTons === "number"
      ? String(body.quantityTons)
      : null;
  const expectedDurationHours =
    typeof body.expectedDurationHours === "string" || typeof body.expectedDurationHours === "number"
      ? String(body.expectedDurationHours)
      : null;
  const dueDateRaw = typeof body.dueDate === "string" ? body.dueDate : null;
  const parsedDueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const priority = coerceWorkOrderPriority(body.priority);

  const orderId = await WorkerOrderService.createOwnOrder(ctx.userId, ctx.companyId, {
    categoryId,
    resourceId,
    materialId,
    customerId,
    quantityTons,
    taskDescription,
    expectedDurationHours,
    dueDate: parsedDueDate,
    priority,
  });

  return jsonOk({ orderId });
}, {
  mapUnknownError: (err) => {
    if (err instanceof Error && err.message === "forbidden") return jsonError("Forbidden", 403);
    if (err instanceof Error && err.message === "session_active") return jsonError("session_active", 400);
    if (err instanceof Error && err.message === "schedule_conflict") return jsonError("schedule_conflict", 409);
    if (err instanceof Error && err.message === "resource_busy") return jsonError("resource_busy", 409);
    if (err instanceof Error && err.message === "invalid_category") return jsonError("invalid_category", 400);
    if (err instanceof Error && err.message !== "ok") return jsonError(err.message, 400);
    return null;
  },
  defaultErrorCode: "save_error",
});
