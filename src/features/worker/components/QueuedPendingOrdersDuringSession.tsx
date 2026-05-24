"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ListOrdered } from "lucide-react";
import { WorkOrderPendingCard } from "@/components/work-orders/WorkOrderPendingCard";
import type { AppDictionary } from "@/i18n/types";
import { formatDict } from "@/i18n";
import type { WorkOrder } from "@/types/worker";

type Props = {
  orders: WorkOrder[];
  dict: AppDictionary["worker"]["client"];
};

/** Podgląd kolejki PENDING podczas aktywnej sesji (bez przycisku start — tylko informacja + konflikty). */
export function QueuedPendingOrdersDuringSession({ orders, dict }: Props) {
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
            <WorkOrderPendingCard
              key={order.id}
              order={order}
              dict={dict}
              mode="preview"
              density="compact"
              positionLabel={formatDict(dict.queuedOrdersPosition, { n: index + 1 })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
