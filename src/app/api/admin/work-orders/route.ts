import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";

export const dynamic = "force-dynamic";

import { normalizeDecimalBodyField } from "@/lib/decimalInput";
import {
  buildWorkOrderDescriptionFields,
  normalizeWorkOrderMaterialFieldsForCategory,
} from "@/lib/workOrderCategoryFields";
import { isMissingWorkOrderRepairColumns } from "@/lib/postgresMigrationHints";
import {
  coerceWorkOrderPriority,
  resolveOrderTypeForCategory,
  validateCategoryForOrder,
} from "@/lib/workOrderCategoryValidation";
import { AdminOrderService } from "@/services/AdminOrderService";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { guardDispatchMutation } from "@/lib/requireDispatchMutation";

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
    const auth = await guardDispatchMutation();
    if (auth instanceof Response) return auth;
    const { companyId, userId: adminUserId, role: actorRole } = auth;

    const body = await parseJsonBody(request);

    const userId = body.userId;
    const resourceId = body.resourceId;
    const categoryId = body.categoryId;
    const materialId = body.materialId;
    const customerId = body.customerId;
    const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : null;
    const repairDescription =
      typeof body.repairDescription === "string" ? body.repairDescription : null;
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
        repairDescription,
        orderType: body.orderType,
      });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "invalid_category", 400);
    }

    const prio = coerceWorkOrderPriority(priority);
    const durationStoredForBlock = normalizeDecimalBodyField(expectedDurationHours);
    const durationHoursForBlock =
      durationStoredForBlock != null ? Number.parseFloat(durationStoredForBlock) : null;

    if (!forceSave) {
      const blockCode = await AdminOrderService.getScheduleSaveBlockCode(
        companyId,
        uidNum,
        resIdNum,
        dueDate ? new Date(dueDate) : null,
        durationHoursForBlock
      );
      if (blockCode) {
        return jsonError(blockCode, 409);
      }
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return jsonError("invalid_payload", 400);
    }
    const durationStored = durationStoredForBlock;
    const parsedDuration = durationHoursForBlock;

    const orderType = await resolveOrderTypeForCategory(companyId, catIdNum, body.orderType);

    const { DictionaryService } = await import("@/services/DictionaryService");
    const categoryRow = await DictionaryService.getResourceCategoryById(companyId, catIdNum);

    const matIdParsed = materialId ? parseInt(String(materialId), 10) : null;
    const { materialId: orderMaterialId, quantityTons: orderQuantityTons } =
      normalizeWorkOrderMaterialFieldsForCategory(categoryRow, matIdParsed, quantityTons);
    const { taskDescription: taskStored, repairDescription: repairStored } =
      buildWorkOrderDescriptionFields(orderType, categoryRow, {
        taskDescription,
        repairDescription,
      });

    await AdminOrderService.createOrder(
      {
        companyId,
        userId: uidNum,
        resourceId: resIdNum,
        categoryId: catIdNum,
        materialId: orderMaterialId,
        customerId: customerId ? parseInt(String(customerId), 10) : null,
        taskDescription: taskStored,
        status: "PENDING",
        quantityTons: orderQuantityTons,
        expectedDurationHours: durationStored,
        priority: prio,
        dueDate: parsedDueDate,
        lockedUntil: AdminOrderService.resolveLockedUntil(parsedDueDate, parsedDuration),
        createdById: adminUserId,
        orderType,
        repairDescription: repairStored,
      },
      { userId: adminUserId, role: actorRole }
    );

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (isMissingWorkOrderRepairColumns(err)) {
        console.error("[admin/work-orders] Brak kolumn order_type / repair_* — uruchom migracje.");
        return jsonError("save_error", 503);
      }
      if (err instanceof Error) {
        if (err.message === "forbidden") return jsonError("forbidden", 403);
        console.error("[admin/work-orders] POST:", err.message);
      }
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
