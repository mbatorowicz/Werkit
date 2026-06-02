import { resolveOrderType } from "@/lib/orderType";
import { DictionaryService } from "@/services/DictionaryService";
import type { OrderType } from "@/types/worker";

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
  }
):
  | "ok"
  | "invalid_category"
  | "missing_customer"
  | "missing_material"
  | "missing_quantity"
  | "missing_task_description" {
  if (!cat) return "invalid_category";

  const hasCustomer = payload.customerId != null && String(payload.customerId).trim() !== "";
  if (cat.reqCustomer && !hasCustomer) return "missing_customer";

  const hasMaterial = payload.materialId != null && String(payload.materialId).trim() !== "";
  if (cat.reqMaterial && !hasMaterial) return "missing_material";

  if (cat.reqQuantity) {
    const raw = payload.quantityTons;
    const n =
      typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return "missing_quantity";
  }

  if (cat.reqTaskDescription) {
    const d = typeof payload.taskDescription === "string" ? payload.taskDescription.trim() : "";
    if (!d) return "missing_task_description";
  }

  return "ok";
}

export async function validateCategoryForOrder(
  companyId: number,
  categoryId: number,
  fields: {
    customerId?: unknown;
    materialId?: unknown;
    quantityTons?: unknown;
    taskDescription?: unknown;
  }
): Promise<{ ok: true } | never> {
  const categoryRow = await DictionaryService.getResourceCategoryById(companyId, categoryId);
  if (!categoryRow || categoryRow.isGroup) {
    throw new Error("invalid_category");
  }
  const check = validateWorkOrderFieldsAgainstCategory(categoryRow, fields);
  if (check !== "ok") {
    throw new Error(check);
  }
  return { ok: true };
}

export function coerceWorkOrderPriority(value: unknown): "URGENT" | "HIGH" | "NORMAL" | "LOW" {
  if (value === "URGENT" || value === "HIGH" || value === "NORMAL" || value === "LOW") {
    return value;
  }
  return "NORMAL";
}

/** Rodzaj zlecenia z body lub z kategorii zlecenia (`resource_categories.order_type`). */
export async function resolveOrderTypeForCategory(
  companyId: number,
  categoryId: number,
  explicit: unknown
): Promise<OrderType> {
  const categoryRow = await DictionaryService.getResourceCategoryById(companyId, categoryId);
  return resolveOrderType(explicit, categoryRow?.orderType);
}
