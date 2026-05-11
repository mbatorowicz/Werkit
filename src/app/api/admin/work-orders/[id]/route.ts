import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { getUserId } from '@/lib/auth';
import { coerceWorkOrderPriority, validateWorkOrderFieldsAgainstCategory } from '@/lib/workOrderCategoryValidation';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { AdminOrderService } from '@/services/AdminOrderService';

export const dynamic = 'force-dynamic';

export const PUT = withApiErrorHandling(
  async (request: Request, props: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const userId = await getUserId();
    if (!userId) return jsonError("Unauthorized", 401);

    const params = await props.params;
    const orderId = parseInt(params.id, 10);
    if (Number.isNaN(orderId)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const assignedUserId = body.userId;
    const resourceId = body.resourceId;
    const categoryId = body.categoryId;
    const materialId = body.materialId;
    const customerId = body.customerId;
    const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : null;
    const quantityTons = typeof body.quantityTons === "string" || typeof body.quantityTons === "number" ? body.quantityTons : null;
    const expectedDurationHours =
      typeof body.expectedDurationHours === "string" || typeof body.expectedDurationHours === "number"
        ? body.expectedDurationHours
        : null;
    const priority = body.priority;
    const dueDate = typeof body.dueDate === "string" ? body.dueDate : null;
    const forceSave = Boolean(body.forceSave);

    const uidNum = parseInt(String(assignedUserId), 10);
    const resIdNum = parseInt(String(resourceId), 10);
    const catIdNum = parseInt(String(categoryId), 10);

    if (!assignedUserId || !resourceId || !categoryId || Number.isNaN(uidNum) || Number.isNaN(resIdNum) || Number.isNaN(catIdNum)) {
      return jsonError("missing_fields", 400);
    }

    const { DictionaryService } = await import("@/services/DictionaryService");
    const categoryRow = await DictionaryService.getResourceCategoryById(catIdNum);
    const catCheck = validateWorkOrderFieldsAgainstCategory(categoryRow, {
      customerId,
      materialId,
      quantityTons,
      taskDescription,
    });
    if (catCheck !== "ok") {
      return jsonError(catCheck, 400);
    }

    const prio = coerceWorkOrderPriority(priority);

    if (!forceSave) {
      const conflict = await AdminOrderService.checkScheduleConflict(
        uidNum,
        resIdNum,
        dueDate ? new Date(dueDate) : null,
        expectedDurationHours != null && String(expectedDurationHours).trim() !== ""
          ? parseFloat(String(expectedDurationHours))
          : null,
        orderId,
      );
      if (conflict) {
        return jsonError(conflict, 409);
      }
    }

    try {
      await AdminOrderService.updateOrder(orderId, {
        userId: uidNum,
        resourceId: resIdNum,
        categoryId: catIdNum,
        materialId: materialId ? parseInt(String(materialId), 10) : null,
        customerId: customerId ? parseInt(String(customerId), 10) : null,
        taskDescription,
        quantityTons: quantityTons != null && String(quantityTons).trim() !== "" ? String(quantityTons) : null,
        expectedDurationHours:
          expectedDurationHours != null && String(expectedDurationHours).trim() !== "" ? String(expectedDurationHours) : null,
        priority: prio,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "not_found") return jsonError("not_found", 404);
      if (msg === "not_pending") return jsonError("not_pending", 404);
      throw e;
    }

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" },
);

export const DELETE = withApiErrorHandling(
  async (_request: Request, props: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const params = await props.params;
    const orderId = parseInt(params.id, 10);
    if (Number.isNaN(orderId)) return jsonError("invalid_id", 400);

    await AdminOrderService.deleteOrder(orderId);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (e) => (e instanceof Error && e.message === "not_found" ? jsonError("not_found", 404) : null),
    defaultErrorCode: "delete_error",
  },
);
