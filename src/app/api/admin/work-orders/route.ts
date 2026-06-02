import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";

export const dynamic = "force-dynamic";

import { normalizeWorkOrderMaterialFields } from "@/lib/workOrderTypePayload";
import {
  coerceWorkOrderPriority,
  resolveOrderTypeForCategory,
  validateCategoryForOrder,
} from "@/lib/workOrderCategoryValidation";
import { AdminOrderService } from "@/services/AdminOrderService";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const data = await AdminOrderService.getActiveWorkOrders(scoped.data.companyId);
    return jsonOk(data);
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId, session } = scoped.data;
    const adminUserId = session.userId as number;

    const body = await parseJsonBody(request);

    const userId = body.userId;
    const resourceId = body.resourceId;
    const categoryId = body.categoryId;
    const materialId = body.materialId;
    const customerId = body.customerId;
    const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : null;
    const quantityTons =
      typeof body.quantityTons === "string" || typeof body.quantityTons === "number"
        ? body.quantityTons
        : null;
    const expectedDurationHours =
      typeof body.expectedDurationHours === "string" ||
      typeof body.expectedDurationHours === "number"
        ? body.expectedDurationHours
        : null;
    const priority = body.priority;
    const dueDate = typeof body.dueDate === "string" ? body.dueDate : null;
    const forceSave = Boolean(body.forceSave);

    const uidNum = parseInt(String(userId), 10);
    const resIdNum = parseInt(String(resourceId), 10);
    const catIdNum = parseInt(String(categoryId), 10);

    if (
      !userId ||
      !resourceId ||
      !categoryId ||
      Number.isNaN(uidNum) ||
      Number.isNaN(resIdNum) ||
      Number.isNaN(catIdNum)
    ) {
      return jsonError("missing_fields", 400);
    }

    try {
      await validateCategoryForOrder(companyId, catIdNum, {
        customerId,
        materialId,
        quantityTons,
        taskDescription,
      });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "invalid_category", 400);
    }

    const prio = coerceWorkOrderPriority(priority);

    if (!forceSave) {
      const blockCode = await AdminOrderService.getScheduleSaveBlockCode(
        companyId,
        uidNum,
        resIdNum,
        dueDate ? new Date(dueDate) : null,
        expectedDurationHours !== null && String(expectedDurationHours).trim() !== ""
          ? parseFloat(String(expectedDurationHours))
          : null
      );
      if (blockCode) {
        return jsonError(blockCode, 409);
      }
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    const parsedDuration =
      expectedDurationHours !== null && String(expectedDurationHours).trim() !== ""
        ? parseFloat(String(expectedDurationHours))
        : null;

    const orderType = await resolveOrderTypeForCategory(companyId, catIdNum, body.orderType);
    const repairDescription =
      typeof body.repairDescription === "string" ? body.repairDescription : null;
    const repairNotes = typeof body.repairNotes === "string" ? body.repairNotes : null;

    const matIdParsed = materialId ? parseInt(String(materialId), 10) : null;
    const { materialId: orderMaterialId, quantityTons: orderQuantityTons } =
      normalizeWorkOrderMaterialFields(orderType, matIdParsed, quantityTons);

    await AdminOrderService.createOrder({
      companyId,
      userId: uidNum,
      resourceId: resIdNum,
      categoryId: catIdNum,
      materialId: orderMaterialId,
      customerId: customerId ? parseInt(String(customerId), 10) : null,
      taskDescription,
      status: "PENDING",
      quantityTons: orderQuantityTons,
      expectedDurationHours:
        expectedDurationHours !== null && String(expectedDurationHours).trim() !== ""
          ? String(expectedDurationHours)
          : null,
      priority: prio,
      dueDate: parsedDueDate,
      lockedUntil: AdminOrderService.resolveLockedUntil(parsedDueDate, parsedDuration),
      createdById: adminUserId,
      orderType,
      repairDescription,
      repairNotes,
    });

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" }
);
