/** Parsowanie dodatnich identyfikatorów z segmentów URL lub pól JSON (API). */

export function parsePositiveIntFromString(raw: string): number | null {
  return parsePositiveIntParam(raw);
}

export function parsePositiveIntParam(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value.trim())))
    return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return n;
}

function parseOptionalPositiveInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parsePositiveIntParam(v);
  if (n == null) throw new Error("invalid_payload");
  return n;
}

export type ParsedOrderBody = {
  categoryId: number;
  resourceId: number;
  materialId: number | null;
  customerId: number | null;
  taskDescription: string | null;
  quantityTons: string | null;
  expectedDurationHours: string | null;
  dueDate: Date | null;
  priority: string | null;
  orderType: string | null;
  repairDescription: string | null;
};

export function parseOrderBody(body: Record<string, unknown>): ParsedOrderBody {
  for (const key of ["taskDescription", "repairDescription", "orderType", "dueDate", "priority"]) {
    if (body[key] != null && typeof body[key] !== "string") throw new Error("invalid_payload");
  }
  for (const key of ["quantityTons", "expectedDurationHours"]) {
    if (body[key] != null && typeof body[key] !== "string" && typeof body[key] !== "number")
      throw new Error("invalid_payload");
  }
  const categoryId = parsePositiveIntParam(body.categoryId);
  const resourceId = parsePositiveIntParam(body.resourceId);
  if (categoryId == null || resourceId == null) {
    throw new Error("missing_fields");
  }

  const materialId = parseOptionalPositiveInt(body.materialId);
  const customerId = parseOptionalPositiveInt(body.customerId);

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
  if (dueDateRaw && (!parsedDueDate || Number.isNaN(parsedDueDate.getTime()))) {
    throw new Error("invalid_payload");
  }
  const priority = typeof body.priority === "string" ? body.priority : null;

  const orderType = typeof body.orderType === "string" ? body.orderType : null;
  const repairDescription =
    typeof body.repairDescription === "string" ? body.repairDescription : null;

  return {
    categoryId,
    resourceId,
    materialId,
    customerId,
    taskDescription,
    quantityTons,
    expectedDurationHours,
    dueDate: parsedDueDate,
    priority,
    orderType,
    repairDescription,
  };
}
