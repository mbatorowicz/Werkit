import { getDictionary } from "@/i18n";
import type { OrderType } from "@/types/worker";
import { isRepairOrderType } from "@/lib/orderType";

export type OrderLabelCategoryFlags = {
  showMaterial?: boolean;
  showCustomer?: boolean;
  showQuantity?: boolean;
  showTaskDescription?: boolean;
};

export type OrderLabelFieldVisibility = {
  showMode: boolean;
  showMaterial: boolean;
  showQuantity: boolean;
  showCustomer: boolean;
  showDescription: boolean;
  descriptionLabel: string;
};

/** Które wiersze karty zlecenia pokazać (kategoria + rodzaj machine_repair). */
export function resolveOrderLabelFieldVisibility(input: {
  orderType?: OrderType | string | null;
} & OrderLabelCategoryFlags): OrderLabelFieldVisibility {
  const repair = isRepairOrderType(input.orderType);
  const fieldLabels = getDictionary().admin.orderFields;
  const sm = input.showMaterial ?? true;
  const sc = input.showCustomer ?? true;
  const sq = input.showQuantity ?? true;
  const std = input.showTaskDescription ?? true;

  return {
    showMode: true,
    showMaterial: !repair && sm,
    showQuantity: !repair && sq,
    showCustomer: sc,
    showDescription: repair ? true : std,
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

/** Flagi widoczności z wiersza listy zlecenia (API workera / admina). */
import type { WorkOrder } from "@/types/worker";

/** Wspólne props pól treści karty dla wiersza zlecenia workera. */
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
