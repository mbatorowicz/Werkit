export type CategoryRequirementFlags = {
  reqCustomer: boolean;
  reqMaterial: boolean;
  reqQuantity: boolean;
  reqTaskDescription: boolean;
};

/**
 * Sprawdza payload zlecenia względem flag z `resource_categories`.
 */
export function validateWorkOrderFieldsAgainstCategory(
  cat: CategoryRequirementFlags | null | undefined,
  payload: {
    customerId?: unknown;
    materialId?: unknown;
    quantityTons?: unknown;
    taskDescription?: unknown;
  },
):
  | "ok"
  | "invalid_category"
  | "missing_customer"
  | "missing_material"
  | "missing_quantity"
  | "missing_task_description" {
  if (!cat) return "invalid_category";

  const hasCustomer =
    payload.customerId != null && String(payload.customerId).trim() !== "";
  if (cat.reqCustomer && !hasCustomer) return "missing_customer";

  const hasMaterial =
    payload.materialId != null && String(payload.materialId).trim() !== "";
  if (cat.reqMaterial && !hasMaterial) return "missing_material";

  if (cat.reqQuantity) {
    const raw = payload.quantityTons;
    const n =
      typeof raw === "number"
        ? raw
        : Number.parseFloat(String(raw ?? "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return "missing_quantity";
  }

  if (cat.reqTaskDescription) {
    const d =
      typeof payload.taskDescription === "string"
        ? payload.taskDescription.trim()
        : "";
    if (!d) return "missing_task_description";
  }

  return "ok";
}

export function coerceWorkOrderPriority(value: unknown): "URGENT" | "HIGH" | "NORMAL" | "LOW" {
  if (value === "URGENT" || value === "HIGH" || value === "NORMAL" || value === "LOW") {
    return value;
  }
  return "NORMAL";
}
