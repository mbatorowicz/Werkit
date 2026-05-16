import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

import { JWT_SECRET } from '@/lib/auth';
import { coerceWorkOrderPriority, validateWorkOrderFieldsAgainstCategory } from '@/lib/workOrderCategoryValidation';
import { AdminOrderService } from '@/services/AdminOrderService';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const GET = withApiErrorHandling(async () => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  const data = await AdminOrderService.getActiveWorkOrders(scoped.data.companyId);
  return jsonOk(data);
}, { defaultErrorCode: "fetch_error" });

export const POST = withApiErrorHandling(async (request: Request) => {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return jsonError("Unauthorized", 401);
  const verified = await jwtVerify(token, JWT_SECRET);
  if (verified.payload.role !== "admin") return jsonError("Forbidden", 403);

  const companyId = verified.payload.companyId;
  if (companyId == null || typeof companyId !== 'number') {
    return jsonError("Forbidden", 403);
  }

  const body = await parseJsonBody(request);

  const userId = body.userId;
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

    const uidNum = parseInt(String(userId), 10);
    const resIdNum = parseInt(String(resourceId), 10);
    const catIdNum = parseInt(String(categoryId), 10);

    if (!userId || !resourceId || !categoryId || Number.isNaN(uidNum) || Number.isNaN(resIdNum) || Number.isNaN(catIdNum)) {
      return jsonError("missing_fields", 400);
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    const categoryRow = await DictionaryService.getResourceCategoryById(companyId, catIdNum);
    if (!categoryRow || categoryRow.isGroup) {
      return jsonError("invalid_category", 400);
    }
    const catCheck = validateWorkOrderFieldsAgainstCategory(categoryRow, {
      customerId,
      materialId,
      quantityTons,
      taskDescription,
    });
    if (catCheck !== 'ok') {
      return jsonError(catCheck, 400);
    }

    const prio = coerceWorkOrderPriority(priority);

    if (!forceSave) {
      const conflict = await AdminOrderService.checkScheduleConflict(
        companyId,
        uidNum,
        resIdNum,
        dueDate ? new Date(dueDate) : null,
        expectedDurationHours != null && String(expectedDurationHours).trim() !== ""
          ? parseFloat(String(expectedDurationHours))
          : null,
      );
      if (conflict) {
        return jsonError(conflict, 409);
      }
    }

    await AdminOrderService.createOrder({
      companyId,
      userId: uidNum,
      resourceId: resIdNum,
      categoryId: catIdNum,
      materialId: materialId ? parseInt(String(materialId), 10) : null,
      customerId: customerId ? parseInt(String(customerId), 10) : null,
      taskDescription,
      status: 'PENDING',
      quantityTons: quantityTons != null && String(quantityTons).trim() !== "" ? String(quantityTons) : null,
      expectedDurationHours:
        expectedDurationHours != null && String(expectedDurationHours).trim() !== "" ? String(expectedDurationHours) : null,
      priority: prio,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: verified.payload.userId as number
    });

  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });
