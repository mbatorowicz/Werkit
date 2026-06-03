import { formatUiDateOnly, formatUiTimeHm } from "@/i18n";
import {
  orderLabelDescriptionText,
  workOrderOrderLabelCardFields,
  type OrderLabelFieldVisibility,
} from "@/lib/orderLabelFieldVisibility";
import type { Session, WorkOrder, WorkOrderPriority } from "@/types/worker";

export type WorkerOrderDetailsData = {
  orderId: number;
  categoryName: string;
  categoryColor?: string | null;
  fieldVisibility: OrderLabelFieldVisibility;
  resourceName: string;
  materialName?: string | null;
  quantity?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  description?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  orderedBy?: string | null;
  priority?: WorkOrderPriority | null;
};

export function workerOrderDetailsFromWorkOrder(
  order: WorkOrder,
  tonsSuffix: string
): WorkerOrderDetailsData {
  const labelFields = workOrderOrderLabelCardFields(order, tonsSuffix);
  const due = order.dueDate?.trim() ? order.dueDate : order.createdAt;
  return {
    orderId: order.id,
    categoryName: labelFields.mode || "—",
    categoryColor: labelFields.modeColor,
    fieldVisibility: labelFields.fieldVisibility,
    resourceName: labelFields.machine,
    materialName: labelFields.material,
    quantity: labelFields.quantity,
    customerName: labelFields.customer,
    customerPhone: order.customerPhone?.trim() || null,
    customerAddress: order.customerAddress?.trim() || null,
    description: labelFields.description,
    dateLabel: formatUiDateOnly(due),
    timeLabel: formatUiTimeHm(due),
    orderedBy: order.creatorName?.trim() || null,
    priority: order.priority,
  };
}

export function workerOrderDetailsFromSession(
  session: Session,
  tonsSuffix: string,
  dict: { noCategoryName: string }
): WorkerOrderDetailsData {
  const customerName =
    `${session.customerLastName || ""} ${session.customerFirstName || ""}`.trim() ||
    session.customerAddress?.trim() ||
    null;
  const fieldVisibility = workOrderOrderLabelCardFields(
    {
      orderType: session.orderType ?? null,
      categoryName: session.categoryName ?? null,
      categoryColor: session.categoryColor ?? null,
      resourceName: session.resourceName ?? null,
      materialName: session.materialName ?? null,
      quantityTons: session.quantityTons ?? null,
      customerName,
      taskDescription: session.taskDescription ?? null,
      repairDescription: session.repairDescription ?? null,
      categoryShowMaterial: session.categoryShowMaterial,
      categoryShowCustomer: session.categoryShowCustomer,
      categoryShowQuantity: session.categoryShowQuantity,
      categoryShowTaskDescription: session.categoryShowTaskDescription,
    },
    tonsSuffix
  ).fieldVisibility;

  return {
    orderId: session.workOrderId ?? session.id,
    categoryName: session.categoryName?.trim() || dict.noCategoryName,
    categoryColor: session.categoryColor,
    fieldVisibility,
    resourceName: session.resourceName || "—",
    materialName: session.materialName,
    quantity: session.quantityTons ? `${session.quantityTons}${tonsSuffix}` : null,
    customerName,
    customerPhone: session.customerPhone?.trim() || null,
    customerAddress: session.customerAddress?.trim() || null,
    description: orderLabelDescriptionText({
      orderType: session.orderType,
      taskDescription: session.taskDescription,
      repairDescription: session.repairDescription,
    }),
    dateLabel: formatUiDateOnly(session.startTime),
    timeLabel: `${formatUiTimeHm(session.startTime)} – …`,
    priority: null,
  };
}

/** href dla `tel:` — usuwa spacje, zostawia cyfry i leading +. */
export function phoneTelHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized || phone}`;
}
