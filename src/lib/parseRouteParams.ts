/** Parsowanie dodatnich identyfikatorów z segmentów URL lub pól JSON (API). */

export function parsePositiveIntFromString(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export function parsePositiveIntParam(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

function parseOptionalPositiveInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parsePositiveIntParam(v);
  if (n == null) throw new Error('invalid_payload');
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
};

export function parseOrderBody(body: Record<string, unknown>): ParsedOrderBody {
  const categoryId = parsePositiveIntParam(body.categoryId);
  const resourceId = parsePositiveIntParam(body.resourceId);
  if (categoryId == null || resourceId == null) {
    throw new Error('missing_fields');
  }

  const materialId = parseOptionalPositiveInt(body.materialId);
  const customerId = parseOptionalPositiveInt(body.customerId);

  const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : null;
  const quantityTons = typeof body.quantityTons === "string" || typeof body.quantityTons === "number"
    ? String(body.quantityTons) : null;
  const expectedDurationHours = typeof body.expectedDurationHours === "string" || typeof body.expectedDurationHours === "number"
    ? String(body.expectedDurationHours) : null;
  const dueDateRaw = typeof body.dueDate === "string" ? body.dueDate : null;
  const parsedDueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const priority = typeof body.priority === "string" ? body.priority : null;

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
  };
}
