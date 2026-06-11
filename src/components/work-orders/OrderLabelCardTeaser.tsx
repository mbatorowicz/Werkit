"use client";

import type { OrderLabelFieldVisibility } from "@/lib/orderLabelFieldVisibility";
import type { OrderLabelCustomerDisplay } from "@/lib/orderLabelCustomerDisplay";

export interface OrderLabelCardTeaserProps {
  machine: string;
  material?: string | null;
  customerDisplay: OrderLabelCustomerDisplay;
  vis: OrderLabelFieldVisibility;
  showDateTime: boolean;
  dateTimeTeaser: string;
  isClickable: boolean;
  teaserHint: string;
}

export function OrderLabelCardTeaser({
  machine,
  material,
  customerDisplay,
  vis,
  showDateTime,
  dateTimeTeaser,
  isClickable,
  teaserHint,
}: OrderLabelCardTeaserProps) {
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
        {machine?.trim() || "—"}
      </p>
      {vis.showCustomer && customerDisplay.customerName ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
          {customerDisplay.customerName}
        </p>
      ) : null}
      {vis.showMaterial && material?.trim() ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">{material}</p>
      ) : null}
      {showDateTime && dateTimeTeaser ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{dateTimeTeaser}</p>
      ) : null}
      {isClickable ? (
        <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 pt-0.5">
          {teaserHint}
        </p>
      ) : null}
    </div>
  );
}
