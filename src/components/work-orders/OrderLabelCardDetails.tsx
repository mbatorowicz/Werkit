"use client";

import { OrderDetailField } from "@/components/work-orders/OrderDetailField";
import {
  CustomerContactFields,
  type CustomerContactFieldLabels,
} from "@/components/customers/CustomerContactFields";
import type { OrderLabelFieldVisibility } from "@/lib/orderLabelFieldVisibility";
import type { OrderLabelCustomerDisplay } from "@/lib/orderLabelCustomerDisplay";

function textOrDash(value?: string | null): string {
  return value?.trim() ? value : "—";
}

function hasText(value?: string | null): value is string {
  return Boolean(value?.trim());
}

export interface OrderLabelCardDetailsLabels {
  machine: string;
  material: string;
  quantity: string;
  description: string;
  date: string;
  time: string;
}

export interface OrderLabelCardDetailsProps {
  isCompact: boolean;
  labels: OrderLabelCardDetailsLabels;
  vis: OrderLabelFieldVisibility;
  machine: string;
  material?: string | null;
  quantity?: string | null;
  customerContactLabels: CustomerContactFieldLabels;
  customerDisplay: OrderLabelCustomerDisplay;
  description?: string | null;
  showDateTime: boolean;
  dateLabel?: string | null;
  timeLabel?: string | null;
  orderedBy?: string | null;
  orderedByText: string;
}

export function OrderLabelCardDetails({
  isCompact,
  labels,
  vis,
  machine,
  material,
  quantity,
  customerContactLabels,
  customerDisplay,
  description,
  showDateTime,
  dateLabel,
  timeLabel,
  orderedBy,
  orderedByText,
}: OrderLabelCardDetailsProps) {
  return (
    <>
      <div
        className={`grid grid-cols-1 ${isCompact ? "gap-y-1.5" : "gap-x-4 gap-y-2 sm:grid-cols-2"}`}
      >
        <OrderDetailField label={labels.machine} value={machine || "—"} />
        {vis.showMaterial ? (
          <OrderDetailField label={labels.material} value={textOrDash(material)} />
        ) : null}
        {vis.showQuantity ? (
          <OrderDetailField label={labels.quantity} value={textOrDash(quantity)} />
        ) : null}
        {vis.showCustomer ? (
          <CustomerContactFields
            variant="order"
            labels={customerContactLabels}
            customerName={customerDisplay.customerName}
            phone={customerDisplay.customerPhone}
            addressParts={customerDisplay.addressParts}
          />
        ) : null}
        {vis.showDescription && hasText(description) ? (
          <OrderDetailField
            label={labels.description}
            value={description}
            multiline
            className={isCompact ? undefined : "sm:col-span-2"}
          />
        ) : null}
        {showDateTime ? (
          <OrderDetailField label={labels.date} value={textOrDash(dateLabel)} />
        ) : null}
        {showDateTime ? (
          <OrderDetailField label={labels.time} value={textOrDash(timeLabel)} />
        ) : null}
      </div>

      {hasText(orderedBy) ? (
        <div className={isCompact ? "mt-2" : "mt-3"}>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {orderedByText}{" "}
            <span className="font-medium text-zinc-600 dark:text-zinc-300">{orderedBy}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
