export type WorkOrderRoutePayload = {
  userId: unknown;
  resourceId: unknown;
  categoryId: unknown;
  materialId: unknown;
  customerId: unknown;
  taskDescription: string | null;
  repairDescription: string | null;
  quantityTons: string | number | null;
  expectedDurationHours: string | number | null;
  priority: unknown;
  dueDate: string | null;
  forceSave: boolean;
};

export function parseWorkOrderRoutePayload(body: Record<string, unknown>): WorkOrderRoutePayload {
  return {
    userId: body.userId,
    resourceId: body.resourceId,
    categoryId: body.categoryId,
    materialId: body.materialId,
    customerId: body.customerId,
    taskDescription: typeof body.taskDescription === "string" ? body.taskDescription : null,
    repairDescription: typeof body.repairDescription === "string" ? body.repairDescription : null,
    quantityTons:
      typeof body.quantityTons === "string" || typeof body.quantityTons === "number"
        ? body.quantityTons
        : null,
    expectedDurationHours:
      typeof body.expectedDurationHours === "string" ||
      typeof body.expectedDurationHours === "number"
        ? body.expectedDurationHours
        : null,
    priority: body.priority,
    dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
    forceSave: Boolean(body.forceSave),
  };
}

export function parseWorkOrderRequiredIds(payload: {
  userId: unknown;
  resourceId: unknown;
  categoryId: unknown;
}): { uidNum: number; resIdNum: number; catIdNum: number } | null {
  const uidNum = parseInt(String(payload.userId), 10);
  const resIdNum = parseInt(String(payload.resourceId), 10);
  const catIdNum = parseInt(String(payload.categoryId), 10);

  if (
    !payload.userId ||
    !payload.resourceId ||
    !payload.categoryId ||
    Number.isNaN(uidNum) ||
    Number.isNaN(resIdNum) ||
    Number.isNaN(catIdNum)
  ) {
    return null;
  }
  return { uidNum, resIdNum, catIdNum };
}
