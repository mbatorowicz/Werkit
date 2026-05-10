"use client";

import type { WorkOrder } from "@/types/worker";
import type { AppDictionary } from "@/i18n/types";

type SummaryDict = Pick<
  AppDictionary["worker"]["client"],
  "machine" | "aggregate" | "wizardSummaryCustomer" | "task" | "durationLabel" | "orderedBy"
>;

const bodyText = "text-sm text-zinc-700 dark:text-zinc-300";
const mutedLabel = "text-zinc-500";
const taskComfortable = "text-sm text-zinc-700 dark:text-zinc-300 mt-2";

/** Wspólny blok szczegółów zlecenia (worker). */
export function WorkOrderSummaryLines({
  order,
  dict,
  taskItalic = false,
  showDurationCreator = false,
}: {
  order: WorkOrder;
  dict: SummaryDict;
  taskItalic?: boolean;
  showDurationCreator?: boolean;
}) {
  const taskClass = taskItalic ? `${taskComfortable} italic` : `${taskComfortable}`;

  return (
    <>
      <div className={bodyText}>
        <span className={mutedLabel}>{dict.machine} </span>
        {order.resourceName}
      </div>
      {order.materialName && (
        <div className={bodyText}>
          <span className={mutedLabel}>{dict.aggregate} </span>
          {order.materialName}
          {order.quantityTons ? ` (${order.quantityTons}t)` : ""}
        </div>
      )}
      {order.customerName && (
        <div className={bodyText}>
          <span className={mutedLabel}>{dict.wizardSummaryCustomer} </span>
          {order.customerName}
        </div>
      )}
      {order.taskDescription &&
        (taskItalic ? (
          <div className={taskClass}>&ldquo;{order.taskDescription}&rdquo;</div>
        ) : (
          <div className={taskComfortable}>
            {dict.task} {order.taskDescription}
          </div>
        ))}
      {showDurationCreator && order.expectedDurationHours != null && (
        <div className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
          <span className="text-zinc-500">{dict.durationLabel} </span>
          {order.expectedDurationHours}h
        </div>
      )}
      {showDurationCreator && order.creatorName && (
        <div className="text-xs text-zinc-500 mt-2">
          {dict.orderedBy} <span className="font-medium">{order.creatorName}</span>
        </div>
      )}
    </>
  );
}
