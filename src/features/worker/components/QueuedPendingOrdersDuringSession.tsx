"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ListOrdered } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { DEFAULT_UI_LOCALE, formatDict } from "@/i18n";
import {
  workOrderCategoryHeadingClass,
  workOrderPendingListCardClass,
} from "@/features/worker/lib/workOrderPresentation";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import type { WorkOrder } from "@/types/worker";

type Props = {
  orders: WorkOrder[];
  dict: AppDictionary["worker"]["client"];
  adminDict: AppDictionary["admin"]["orders"];
};

/** Podgląd kolejki PENDING podczas aktywnej sesji (bez przycisku start — tylko informacja dla planowania). */
export function QueuedPendingOrdersDuringSession({ orders, dict, adminDict }: Props) {
  const [open, setOpen] = useState(false);

  if (!Array.isArray(orders) || orders.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-600/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-amber-200/80 dark:border-amber-500/25 bg-amber-50/80 dark:bg-amber-500/10 px-3 py-2.5 text-left transition-colors hover:bg-amber-100/90 dark:hover:bg-amber-500/15"
      >
        <div className="flex items-start gap-2 min-w-0">
          <ListOrdered className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              {formatDict(dict.queuedOrdersToggle, { count: orders.length })}
            </div>
            <div className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-0.5 leading-snug">
              {dict.queuedOrdersHint}
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden />
        )}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 max-h-[min(52vh,420px)] overflow-y-auto pr-0.5 custom-scrollbar">
          {orders.map((order, index) => (
            <div key={order.id} className={workOrderPendingListCardClass(order.priority)}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {formatDict(dict.queuedOrdersPosition, { n: index + 1 })}
                </span>
                <WorkOrderPriorityRibbon priority={order.priority} labels={dict} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-500 flex flex-wrap items-center gap-2 min-w-0">
                    <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/30 shrink-0 font-mono">
                      #{order.id}
                    </span>
                    <span className={`font-semibold min-w-0 break-words ${workOrderCategoryHeadingClass(order.priority)}`}>
                      {order.categoryName || dict.noCategoryName}
                    </span>
                  </span>
                </div>
                <OrderLabelCard
                  tone="planned"
                  density="compact"
                  orderNo={`#${order.id}`}
                  mode={order.categoryName || dict.noCategoryName}
                  machine={order.resourceName || "—"}
                  material={order.materialName}
                  quantity={order.quantityTons ? `${order.quantityTons}${adminDict.tons}` : null}
                  customer={order.customerName}
                  description={order.taskDescription}
                  orderedBy={order.creatorName ?? null}
                  orderedByLabel={dict.orderedBy}
                  dateLabel={
                    order.dueDate
                      ? new Date(order.dueDate).toLocaleDateString(DEFAULT_UI_LOCALE)
                      : new Date(order.createdAt).toLocaleDateString(DEFAULT_UI_LOCALE)
                  }
                  timeLabel={
                    order.dueDate
                      ? new Date(order.dueDate).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : new Date(order.createdAt).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                  }
                  className="bg-white/60 dark:bg-zinc-950/30"
                  attachmentPhotos={Boolean(order.hasPhotos)}
                  attachmentNotes={Boolean(order.hasNotes)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
