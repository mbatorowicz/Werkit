import { formatUiDateOnly, formatUiTimeHm, type Locale } from "@/i18n";
import { formatCustomerLabel } from "@/lib/customerSearch";
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
  /** Link do widoku trasy / galerii (lista historii). */
  historyDetailHref?: string | null;
  historyDetailLinkLabel?: string | null;
};

export function workerOrderDetailsFromWorkOrder(
  order: WorkOrder,
  tonsSuffix: string,
  locale?: Locale
): WorkerOrderDetailsData {
  const labelFields = workOrderOrderLabelCardFields(order, tonsSuffix, locale);
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

type SessionDetailsSource = {
  id: number;
  workOrderId?: number | null;
  categoryName: string | null;
  categoryColor?: string | null;
  orderType?: Session["orderType"];
  resourceName?: string | null;
  materialName?: string | null;
  quantityTons?: number | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  taskDescription?: string | null;
  repairDescription?: string | null;
  categoryShowMaterial?: boolean | null;
  categoryShowCustomer?: boolean | null;
  categoryShowQuantity?: boolean | null;
  categoryShowTaskDescription?: boolean | null;
  startTime: string;
  endTime?: string | null;
};

export function workerOrderDetailsFromSession(
  session: SessionDetailsSource,
  tonsSuffix: string,
  dict: { noCategoryName: string },
  locale?: Locale
): WorkerOrderDetailsData {
  const customerName =
    formatCustomerLabel({
      firstName: session.customerFirstName ?? null,
      lastName: session.customerLastName ?? null,
    }) || null;
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
      categoryShowMaterial: session.categoryShowMaterial ?? undefined,
      categoryShowCustomer: session.categoryShowCustomer ?? undefined,
      categoryShowQuantity: session.categoryShowQuantity ?? undefined,
      categoryShowTaskDescription: session.categoryShowTaskDescription ?? undefined,
    },
    tonsSuffix,
    locale
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
    timeLabel: session.endTime
      ? `${formatUiTimeHm(session.startTime)} – ${formatUiTimeHm(session.endTime)}`
      : `${formatUiTimeHm(session.startTime)} – …`,
    priority: null,
  };
}

export { phoneTelHref } from "@/lib/phoneTelHref";
