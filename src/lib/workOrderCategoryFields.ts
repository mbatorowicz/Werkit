import { normalizeDecimalBodyField } from "@/lib/decimalInput";
import { isRepairOrderType } from "@/lib/orderType";
import type { OrderType } from "@/types/worker";

/** Flagi widoczności pól z `resource_categories` (formularz kategorii). */
export type CategoryFieldFlags = {
  showMaterial?: boolean;
  showCustomer?: boolean;
  showQuantity?: boolean;
  showTaskDescription?: boolean;
};

export function resolvedCategoryFieldFlags(flags: CategoryFieldFlags | null | undefined) {
  return {
    showMaterial: flags?.showMaterial ?? true,
    showCustomer: flags?.showCustomer ?? true,
    showQuantity: flags?.showQuantity ?? true,
    showTaskDescription: flags?.showTaskDescription ?? true,
  };
}

/** Zapis do DB: materiał i ilość tylko gdy kategoria je pokazuje. */
export function normalizeWorkOrderMaterialFieldsForCategory(
  category: CategoryFieldFlags | null | undefined,
  materialId: number | null,
  quantityTons: string | number | null
): { materialId: number | null; quantityTons: string | null } {
  const f = resolvedCategoryFieldFlags(category);
  return {
    materialId: f.showMaterial ? materialId : null,
    quantityTons: f.showQuantity ? normalizeDecimalBodyField(quantityTons) : null,
  };
}

/** Opis zlecenia vs opis naprawy — ta sama flaga `showTaskDescription` na kategorii. */
export function buildWorkOrderDescriptionFields(
  orderType: OrderType | string | null | undefined,
  category: CategoryFieldFlags | null | undefined,
  values: { taskDescription?: unknown; repairDescription?: unknown }
): { taskDescription: string | null; repairDescription: string | null } {
  if (!resolvedCategoryFieldFlags(category).showTaskDescription) {
    return { taskDescription: null, repairDescription: null };
  }
  if (isRepairOrderType(orderType)) {
    const d =
      typeof values.repairDescription === "string" ? values.repairDescription.trim() : "";
    return { taskDescription: null, repairDescription: d || null };
  }
  const d = typeof values.taskDescription === "string" ? values.taskDescription.trim() : "";
  return { taskDescription: d || null, repairDescription: null };
}

/** Payload POST/PUT z formularza (wizard / admin) wg flag kategorii. */
export function buildWorkOrderFormPayloadFields(
  orderType: OrderType | string | null | undefined,
  category: CategoryFieldFlags | null | undefined,
  values: {
    materialId: string;
    customerId: string;
    quantityTons: string;
    taskDescription: string;
    repairDescription: string;
  }
) {
  const f = resolvedCategoryFieldFlags(category);
  const desc = buildWorkOrderDescriptionFields(orderType, category, values);
  return {
    materialId: f.showMaterial && values.materialId ? values.materialId : null,
    customerId: f.showCustomer && values.customerId ? values.customerId : null,
    quantityTons: f.showQuantity && values.quantityTons ? values.quantityTons : null,
    ...desc,
  };
}
