import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { normalizeDecimalBodyField } from "@/lib/decimalInput";
import {
  buildWorkOrderDescriptionFields,
  normalizeWorkOrderMaterialFieldsForCategory,
} from "@/lib/workOrderCategoryFields";
import { isMissingWorkOrderRepairColumns } from "@/lib/postgresMigrationHints";
import {
  coerceWorkOrderPriority,
  resolveOrderTypeForCategory,
  validateWorkOrderFieldsAgainstCategory,
} from "@/lib/workOrderCategoryValidation";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { guardDispatchMutation } from "@/lib/requireDispatchMutation";
import { parseWorkOrderRequiredIds, parseWorkOrderRoutePayload } from "@/lib/workOrderRoutePayload";
import { AdminOrderService } from "@/services/AdminOrderService";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

function mapUpdateOrderError(e: unknown): Response | null {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "not_found") return jsonError("not_found", 404);
  if (msg === "not_pending") return jsonError("not_pending", 404);
  if (msg === "forbidden") return jsonError("forbidden", 403);
  return null;
}

export const PUT = withApiErrorHandling(
  async (request: Request, props: { params: Promise<{ id: string }> }) => {
    const auth = await guardDispatchMutation();
    if (auth instanceof Response) return auth;
    const { companyId, userId: actorUserId, role: actorRole } = auth;

    const params = await props.params;
    const orderId = parseInt(params.id, 10);
    if (Number.isNaN(orderId)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const payload = parseWorkOrderRoutePayload(body);
    const {
      materialId,
      customerId,
      taskDescription,
      repairDescription,
      quantityTons,
      expectedDurationHours,
      priority,
      dueDate,
      forceSave,
    } = payload;

    const ids = parseWorkOrderRequiredIds(payload);
    if (!ids) {
      return jsonError("missing_fields", 400);
    }
    const { uidNum, resIdNum, catIdNum } = ids;

    const { DictionaryService } = await import("@/services/DictionaryService");
    const categoryRow = await DictionaryService.getResourceCategoryById(companyId, catIdNum);
    if (!categoryRow || categoryRow.isGroup) {
      return jsonError("invalid_category", 400);
    }
    const catCheck = validateWorkOrderFieldsAgainstCategory(categoryRow, {
      customerId,
      materialId,
      quantityTons,
      taskDescription,
      repairDescription,
      orderType: body.orderType,
    });
    if (catCheck !== "ok") {
      return jsonError(catCheck, 400);
    }

    const prio = coerceWorkOrderPriority(priority);
    const durationStored = normalizeDecimalBodyField(expectedDurationHours);
    const parsedDuration = durationStored != null ? Number.parseFloat(durationStored) : null;

    if (!forceSave) {
      const blockCode = await AdminOrderService.getScheduleSaveBlockCode(
        companyId,
        uidNum,
        resIdNum,
        dueDate ? new Date(dueDate) : null,
        parsedDuration,
        orderId
      );
      if (blockCode) {
        return jsonError(blockCode, 409);
      }
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return jsonError("invalid_payload", 400);
    }

    const orderType = await resolveOrderTypeForCategory(companyId, catIdNum, body.orderType);

    const matIdParsed = materialId ? parseInt(String(materialId), 10) : null;
    const { materialId: orderMaterialId, quantityTons: orderQuantityTons } =
      normalizeWorkOrderMaterialFieldsForCategory(categoryRow, matIdParsed, quantityTons);
    const { taskDescription: taskStored, repairDescription: repairStored } =
      buildWorkOrderDescriptionFields(orderType, categoryRow, {
        taskDescription,
        repairDescription,
      });

    try {
      await AdminOrderService.updateOrder(
        companyId,
        orderId,
        {
          userId: uidNum,
          resourceId: resIdNum,
          categoryId: catIdNum,
          materialId: orderMaterialId,
          customerId: customerId ? parseInt(String(customerId), 10) : null,
          taskDescription: taskStored,
          quantityTons: orderQuantityTons,
          expectedDurationHours: durationStored,
          priority: prio,
          dueDate: parsedDueDate,
          lockedUntil: AdminOrderService.resolveLockedUntil(parsedDueDate, parsedDuration),
          orderType,
          repairDescription: repairStored,
        },
        { userId: actorUserId, role: actorRole }
      );
    } catch (e: unknown) {
      const mapped = mapUpdateOrderError(e);
      if (mapped) return mapped;
      throw e;
    }

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (isMissingWorkOrderRepairColumns(err)) {
        console.error("[admin/work-orders] Brak kolumn order_type / repair_* — uruchom migracje.");
        return jsonError("save_error", 503);
      }
      if (err instanceof Error) {
        console.error("[admin/work-orders] PUT:", err.message);
      }
      return null;
    },
    defaultErrorCode: "save_error",
  }
);

export const DELETE = withApiErrorHandling(
  async (_request: Request, props: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const params = await props.params;
    const orderId = parseInt(params.id, 10);
    if (Number.isNaN(orderId)) return jsonError("invalid_id", 400);

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    await AdminOrderService.deleteOrder(scoped.data.companyId, orderId, scoped.data.session.userId);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (e) =>
      e instanceof Error && e.message === "not_found" ? jsonError("not_found", 404) : null,
    defaultErrorCode: "delete_error",
  }
);
