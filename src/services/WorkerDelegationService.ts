// ============================================================
// Werkit — Delegowanie zleceń przez lidera/kierownika (worker API)
// ============================================================

import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { normalizeDecimalBodyField } from "@/lib/decimalInput";
import {
  buildWorkOrderDescriptionFields,
  normalizeWorkOrderMaterialFieldsForCategory,
} from "@/lib/workOrderCategoryFields";
import { computeLockedUntil } from "@/lib/scheduleConflict";
import { assertOrderEntitiesBelongToCompany } from "@/lib/tenantContext";
import {
  coerceWorkOrderPriority,
  resolveOrderTypeForCategory,
  validateCategoryForOrder,
} from "@/lib/workOrderCategoryValidation";
import { DelegationScopeService } from "@/services/DelegationScopeService";
import { ScheduleConflictService } from "@/services/ScheduleConflictService";

function parseRequiredDelegationIds(body: Record<string, unknown>): {
  userId: number;
  resourceId: number;
  categoryId: number;
} {
  const userId = parseInt(String(body.userId), 10);
  const resourceId = parseInt(String(body.resourceId), 10);
  const categoryId = parseInt(String(body.categoryId), 10);
  if (
    !userId ||
    !resourceId ||
    !categoryId ||
    Number.isNaN(userId) ||
    Number.isNaN(resourceId) ||
    Number.isNaN(categoryId)
  ) {
    throw new Error("missing_fields");
  }
  return { userId, resourceId, categoryId };
}

function parseDelegationDueDate(body: Record<string, unknown>): Date | null {
  const dueDateRaw = typeof body.dueDate === "string" ? body.dueDate : null;
  const parsedDueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
    throw new Error("invalid_payload");
  }
  return parsedDueDate;
}

function parseDelegationOrderFields(body: Record<string, unknown>): {
  materialId: number | null;
  customerId: number | null;
  taskDescription: string | null;
  repairDescription: string | null;
  quantityTons: string | number | null;
  expectedDurationHours: string | number | null;
} {
  const materialId = body.materialId ? parseInt(String(body.materialId), 10) : null;
  const customerId = body.customerId ? parseInt(String(body.customerId), 10) : null;
  const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : null;
  const repairDescription =
    typeof body.repairDescription === "string" ? body.repairDescription : null;
  const quantityTons =
    typeof body.quantityTons === "string" || typeof body.quantityTons === "number"
      ? body.quantityTons
      : null;
  const expectedDurationHours =
    typeof body.expectedDurationHours === "string" || typeof body.expectedDurationHours === "number"
      ? body.expectedDurationHours
      : null;
  return {
    materialId: materialId && !Number.isNaN(materialId) ? materialId : null,
    customerId: customerId && !Number.isNaN(customerId) ? customerId : null,
    taskDescription,
    repairDescription,
    quantityTons,
    expectedDurationHours,
  };
}

export class WorkerDelegationService {
  static async createDelegatedOrder(
    actorUserId: number,
    actorRole: string,
    companyId: number,
    body: Record<string, unknown>
  ): Promise<number> {
    if (actorRole !== "admin") {
      await DelegationScopeService.assertHasDelegationRights(companyId, actorUserId, actorRole);
    }

    const { userId, resourceId, categoryId } = parseRequiredDelegationIds(body);

    await DelegationScopeService.assertCanDelegateTo(companyId, actorUserId, actorRole, userId);

    const fields = parseDelegationOrderFields(body);
    const { taskDescription, repairDescription, quantityTons, expectedDurationHours } = fields;
    const parsedDueDate = parseDelegationDueDate(body);

    const orderPayload = {
      userId,
      resourceId,
      categoryId,
      materialId: fields.materialId,
      customerId: fields.customerId,
      taskDescription,
      repairDescription,
      quantityTons,
      expectedDurationHours,
      dueDate: parsedDueDate,
      orderType: body.orderType,
      priority: body.priority,
    };

    await assertOrderEntitiesBelongToCompany(orderPayload, companyId);

    await validateCategoryForOrder(companyId, categoryId, {
      customerId: orderPayload.customerId,
      materialId: orderPayload.materialId,
      quantityTons: orderPayload.quantityTons,
      taskDescription: orderPayload.taskDescription,
      repairDescription: orderPayload.repairDescription,
      orderType: orderPayload.orderType,
    });

    const { DictionaryService } = await import("@/services/DictionaryService");
    const categoryRow = await DictionaryService.getResourceCategoryById(companyId, categoryId);
    const orderType = await resolveOrderTypeForCategory(
      companyId,
      categoryId,
      typeof body.orderType === "string" ? body.orderType : undefined
    );
    const { materialId: orderMaterialId, quantityTons: orderQuantityTons } =
      normalizeWorkOrderMaterialFieldsForCategory(
        categoryRow,
        orderPayload.materialId,
        quantityTons
      );
    const { taskDescription: taskStored, repairDescription: repairStored } =
      buildWorkOrderDescriptionFields(orderType, categoryRow, {
        taskDescription,
        repairDescription,
      });

    const durationStored = normalizeDecimalBodyField(expectedDurationHours);
    const durationHours = durationStored != null ? Number.parseFloat(durationStored) : null;

    if (!body.forceSave) {
      await ScheduleConflictService.assertNoScheduleConflict(companyId, {
        userId,
        resourceId,
        dueDate: parsedDueDate,
        durationHours,
      });
    }

    const prio = coerceWorkOrderPriority(body.priority);

    const [inserted] = await db
      .insert(workOrders)
      .values({
        companyId,
        userId,
        resourceId,
        categoryId,
        materialId: orderMaterialId,
        customerId: orderPayload.customerId,
        taskDescription: taskStored,
        status: "PENDING",
        quantityTons: orderQuantityTons,
        expectedDurationHours: durationStored,
        priority: prio,
        dueDate: parsedDueDate,
        lockedUntil:
          parsedDueDate && durationHours != null
            ? computeLockedUntil(parsedDueDate, durationHours)
            : null,
        createdById: actorUserId,
        orderType,
        repairDescription: repairStored,
      })
      .returning({ id: workOrders.id });

    return inserted.id;
  }
}
