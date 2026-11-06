import { parsePositiveIntParam } from "./parseRouteParams";

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
  for (const key of ["materialId", "customerId"]) {
    if (body[key] != null && body[key] !== "" && parsePositiveIntParam(body[key]) === null)
      throw new Error("invalid_payload");
  }
  for (const key of ["taskDescription", "repairDescription", "orderType", "dueDate"]) {
    if (body[key] != null && typeof body[key] !== "string") throw new Error("invalid_payload");
  }
  for (const key of ["quantityTons", "expectedDurationHours"]) {
    if (body[key] != null && typeof body[key] !== "string" && typeof body[key] !== "number")
      throw new Error("invalid_payload");
  }
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
    forceSave: body.forceSave === true,
  };
}

export function parseWorkOrderRequiredIds(payload: {
  userId: unknown;
  resourceId: unknown;
  categoryId: unknown;
}): { uidNum: number; resIdNum: number; catIdNum: number } | null {
  const uidNum = parsePositiveIntParam(payload.userId);
  const resIdNum = parsePositiveIntParam(payload.resourceId);
  const catIdNum = parsePositiveIntParam(payload.categoryId);
  if (uidNum === null || resIdNum === null || catIdNum === null) return null;
  return { uidNum, resIdNum, catIdNum };
}
