import { getDictionary } from "@/i18n";
import { isRepairOrderType } from "@/lib/orderType";
import {
  type CategoryFieldFlags,
  resolvedCategoryFieldFlags,
} from "@/lib/workOrderCategoryFields";
import type { OrderType } from "@/types/worker";
import type { WorkOrder } from "@/types/worker";

export type OrderLabelCategoryFlags = CategoryFieldFlags;

export type OrderLabelFieldVisibility = {
  showMode: boolean;
  showMaterial: boolean;
  showQuantity: boolean;
  showCustomer: boolean;
  showDescription: boolean;
  descriptionLabel: string;
};

/** Widoczność wierszy karty — wyłącznie flagi kategorii (+ etykieta opisu wg rodzaju zlecenia). */
export function resolveOrderLabelFieldVisibility(input: {
  orderType?: OrderType | string | null;
} & OrderLabelCategoryFlags): OrderLabelFieldVisibility {
  const f = resolvedCategoryFieldFlags(input);
  const repair = isRepairOrderType(input.orderType);
  const fieldLabels = getDictionary().admin.orderFields;

  return {
    showMode: true,
    showMaterial: f.showMaterial,
    showQuantity: f.showQuantity,
    showCustomer: f.showCustomer,
    showDescription: f.showTaskDescription,
    descriptionLabel: repair ? fieldLabels.repairDescription : fieldLabels.description,
  };
}

export function orderLabelDescriptionText(input: {
  orderType?: OrderType | string | null;
  taskDescription?: string | null;
  repairDescription?: string | null;
}): string | null {
  if (isRepairOrderType(input.orderType)) {
    return input.repairDescription?.trim() ? input.repairDescription : null;
  }
  return input.taskDescription?.trim() ? input.taskDescription : null;
}

export function categoryFlagsFromWorkOrderRow(row: {
  categoryShowMaterial?: boolean;
  categoryShowCustomer?: boolean;
  categoryShowQuantity?: boolean;
  categoryShowTaskDescription?: boolean;
}): OrderLabelCategoryFlags {
  return {
    showMaterial: row.categoryShowMaterial,
    showCustomer: row.categoryShowCustomer,
    showQuantity: row.categoryShowQuantity,
    showTaskDescription: row.categoryShowTaskDescription,
  };
}

export function workOrderOrderLabelCardFields(
  order: Pick<
    WorkOrder,
    | "orderType"
    | "categoryName"
    | "categoryColor"
    | "resourceName"
    | "materialName"
    | "quantityTons"
    | "customerName"
    | "taskDescription"
    | "repairDescription"
    | "categoryShowMaterial"
    | "categoryShowCustomer"
    | "categoryShowQuantity"
    | "categoryShowTaskDescription"
  >,
  tonsSuffix: string
) {
  const fieldVisibility = resolveOrderLabelFieldVisibility({
    orderType: order.orderType,
    ...categoryFlagsFromWorkOrderRow(order),
  });
  return {
    fieldVisibility,
    mode: order.categoryName ?? "",
    modeColor: order.categoryColor ?? null,
    machine: order.resourceName || "—",
    material: order.materialName,
    quantity: order.quantityTons ? `${order.quantityTons}${tonsSuffix}` : null,
    customer: order.customerName,
    description: orderLabelDescriptionText(order),
  };
}
