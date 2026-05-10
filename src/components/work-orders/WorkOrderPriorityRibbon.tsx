"use client";

import type { AppDictionary } from "@/i18n/types";
import type { WorkOrderPriority } from "@/types/worker";

export type WorkOrderPriorityLabels = Pick<
  AppDictionary["worker"]["client"],
  "priorityUrgent" | "priorityImportant" | "priorityNormal" | "priorityLow"
>;

/** Wspólne znaczniki priorytetu (worker + admin) — te same kolory co w aplikacji mobilnej. */
export function WorkOrderPriorityRibbon({
  priority,
  labels,
  accentOnly = false,
}: {
  priority: WorkOrderPriority | null;
  labels: WorkOrderPriorityLabels;
  accentOnly?: boolean;
}) {
  if (accentOnly) {
    return (
      <>
        {priority === "URGENT" && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
            {labels.priorityUrgent}
          </span>
        )}
        {priority === "HIGH" && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            {labels.priorityImportant}
          </span>
        )}
      </>
    );
  }

  if (priority === "URGENT") {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse shrink-0">
        {labels.priorityUrgent}
      </span>
    );
  }
  if (priority === "HIGH") {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 shrink-0">
        {labels.priorityImportant}
      </span>
    );
  }
  if (priority === "LOW") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
        <div className="w-2 h-2 rounded-sm bg-emerald-500 shadow-sm shrink-0" />
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{labels.priorityLow}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-600 shrink-0">
      <div className="w-2 h-2 rounded-sm bg-zinc-400 shadow-sm shrink-0" />
      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{labels.priorityNormal}</span>
    </div>
  );
}
