"use client";

import { useMemo } from "react";
import { ChevronRight, Truck, Tractor, Wrench } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { WorkOrder } from "@/types/worker";
import type { WizardCategory } from "@/types/wizard";
import { formatUiDateOnly, formatUiTimeHm } from "@/i18n";
import {
  sortWorkOrdersByPriorityThenCreated,
  workOrderCategoryHeadingClass,
  workOrderInteractiveSurfaceClass,
} from "@/features/worker/lib/workOrderPresentation";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { AdminSearchCombobox } from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";

type Dict = AppDictionary["worker"]["client"];

type Props = {
  dict: Dict;
  orders: WorkOrder[];
  categories: WizardCategory[];
  categoryId: string;
  setCategoryId: (id: string) => void;
  setStep: (s: number) => void;
  onAcceptOrder: (orderId: number) => void;
};

export function WizardStep1Category({
  dict,
  orders,
  categories,
  categoryId,
  setCategoryId,
  setStep,
  onAcceptOrder,
}: Props) {
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: String(c.id), label: c.name })),
    [categories],
  );

  const selectedCategory = categories.find((c) => String(c.id) === categoryId);
  const SelectedIcon =
    selectedCategory?.icon === "Truck"
      ? Truck
      : selectedCategory?.icon === "Tractor"
        ? Tractor
        : Wrench;

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      {orders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-amber-500 mb-3">{dict.wizardPendingOrders}</h2>
          <div className="space-y-3">
            {sortWorkOrdersByPriorityThenCreated(orders).map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onAcceptOrder(order.id)}
                className={`w-full border text-left p-4 rounded-lg transition-all ${workOrderInteractiveSurfaceClass(order.priority)}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <div className={`font-bold text-lg ${workOrderCategoryHeadingClass(order.priority)}`}>
                    {order.categoryName || dict.noCategoryName}
                  </div>
                  <WorkOrderPriorityRibbon priority={order.priority} labels={dict} accentOnly />
                </div>
                <div className="mt-2">
                  <OrderLabelCard
                    tone="planned"
                    orderNo={`#${order.id}`}
                    mode={order.categoryName || dict.noCategoryName}
                    machine={order.resourceName || "—"}
                    material={order.materialName}
                    quantity={order.quantityTons ? `${order.quantityTons}t` : null}
                    customer={order.customerName}
                    description={order.taskDescription}
                    orderedBy={order.creatorName ?? null}
                    orderedByLabel={dict.orderedBy}
                    dateLabel={
                      order.dueDate ? formatUiDateOnly(order.dueDate) : formatUiDateOnly(order.createdAt)
                    }
                    timeLabel={
                      order.dueDate ? formatUiTimeHm(order.dueDate) : formatUiTimeHm(order.createdAt)
                    }
                    className="bg-white/60 dark:bg-zinc-950/30"
                    attachmentPhotos={Boolean(order.hasPhotos)}
                    attachmentNotes={Boolean(order.hasNotes)}
                  />
                </div>
                <div className="mt-3 text-amber-500 font-semibold text-sm">{dict.startTask} &rarr;</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        {orders.length > 0 ? dict.wizardTitleOwn : dict.wizardTitle}
      </h2>
      <p className="text-zinc-500 text-sm mb-6">{dict.wizardSubtitle}</p>

      <div className="space-y-4">
        <AdminSearchCombobox
          options={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
          placeholder={dict.searchPlaceholder}
          required
          {...comboboxFeedbackProps(dict)}
          aria-label={dict.wizardTitle}
        />
        {selectedCategory ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f2fbfa] text-emerald-500 dark:bg-zinc-900">
              <SelectedIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-zinc-900 dark:text-white">{selectedCategory.name}</div>
              <div className="text-xs text-zinc-500">{dict.wizardClassType}</div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          disabled={!categoryId}
          onClick={() => setStep(2)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {dict.wizardNext} <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
