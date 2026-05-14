"use client";

import { Truck, Tractor, Wrench } from "lucide-react";
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

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {categories.map((c) => {
          const Icon = c.icon === "Truck" ? Truck : c.icon === "Tractor" ? Tractor : Wrench;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(c.id.toString());
                setStep(2);
              }}
              className={`w-full p-5 rounded-lg border transition-all flex items-center gap-4 ${
                categoryId === String(c.id)
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="w-12 h-12 bg-[#f2fbfa] dark:bg-zinc-900 rounded-lg flex items-center justify-center shrink-0 text-emerald-500">
                <Icon className="w-6 h-6" />
              </div>
              <div className="text-left w-full">
                <div className="font-bold text-lg">{c.name}</div>
                <div className="text-xs opacity-70 mt-0.5">{dict.wizardClassType}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
