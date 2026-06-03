"use client";

import { Play } from "lucide-react";
import { ScheduleConflictPanel } from "@/components/work-orders/ScheduleConflictPanel";
import {
  buildScheduleConflictLabels,
  buildWorkOrderScheduleFieldLabels,
  toDatetimeLocalValue,
} from "@/components/work-orders/scheduleConflictI18n";
import { useScheduleConflictPreview } from "@/components/work-orders/useScheduleConflictPreview";
import { workOrderPendingListCardClass } from "@/features/worker/lib/workOrderPresentation";
import { CategoryColorBadge } from "@/components/CategoryColorBadge";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { formatUiDateOnly, formatUiTimeHm, getDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import type { WorkOrder } from "@/types/worker";

type WorkerDict = AppDictionary["worker"]["client"];

export function WorkOrderPendingCard({
  order,
  dict,
  mode,
  onStart,
  acceptError,
  positionLabel,
  density = "normal",
}: {
  order: WorkOrder;
  dict: WorkerDict;
  mode: "start" | "preview";
  onStart?: (orderId: number) => void;
  acceptError?: string | null;
  positionLabel?: string;
  density?: "normal" | "compact";
}) {
  const scheduleDict = getDictionary().workOrdersSchedule;
  const scheduleLabels = buildWorkOrderScheduleFieldLabels(scheduleDict, { mode: "worker" });
  const conflictLabels = buildScheduleConflictLabels(scheduleDict);

  const userId = order.userId != null ? String(order.userId) : "";
  const resourceId = order.resourceId != null ? String(order.resourceId) : "";
  const dueDate = toDatetimeLocalValue(order.dueDate);
  const expectedDurationHours =
    order.expectedDurationHours != null && order.expectedDurationHours > 0
      ? String(order.expectedDurationHours)
      : "";

  const { status, conflicts, hasConflicts } = useScheduleConflictPreview({
    scope: "worker",
    enabled: Boolean(userId && resourceId),
    userId,
    resourceId,
    dueDate,
    expectedDurationHours,
    excludeOrderId: order.id,
  });

  const blocked = mode === "start" && (hasConflicts || Boolean(acceptError));
  const tonsSuffix = scheduleDict.tons;

  return (
    <div className={workOrderPendingListCardClass(order.priority)}>
      {positionLabel ? (
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            {positionLabel}
          </span>
          <WorkOrderPriorityRibbon priority={order.priority} labels={dict} />
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold text-amber-900 dark:text-amber-500 flex flex-wrap items-center gap-2 min-w-0">
            <span
              className={`bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/30 shrink-0 ${density === "compact" ? "font-mono text-xs" : ""}`}
            >
              #{order.id}
            </span>
            <CategoryColorBadge
              label={order.categoryName || dict.noCategoryName}
              color={order.categoryColor}
              size="md"
              className={`max-w-full ${density === "compact" ? "" : "text-base"}`}
            />
          </span>
          {!positionLabel ? (
            <WorkOrderPriorityRibbon priority={order.priority} labels={dict} />
          ) : null}
        </div>
        <div className={positionLabel ? undefined : "mt-2"}>
          <OrderLabelCard
            tone="planned"
            density={density}
            orderNo={`#${order.id}`}
            mode={order.categoryName || dict.noCategoryName}
            modeColor={order.categoryColor}
            machine={order.resourceName || "—"}
            material={order.materialName}
            quantity={order.quantityTons ? `${order.quantityTons}${tonsSuffix}` : null}
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
      </div>

      <ScheduleConflictPanel
        mode="worker"
        status={status}
        conflicts={conflicts}
        labels={conflictLabels}
        title={scheduleLabels.scheduleConflictTitle}
        checkingLabel={scheduleLabels.scheduleConflictChecking}
        workerBlockedHint={scheduleLabels.scheduleConflictWorkerBlockedHint}
      />

      {acceptError ? (
        <p className="text-xs font-medium text-red-700 dark:text-red-400">{acceptError}</p>
      ) : null}

      {mode === "start" && !blocked && onStart ? (
        <button
          type="button"
          onClick={() => onStart(order.id)}
          className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm w-full"
        >
          <Play className="w-4 h-4 fill-current" />
          <span className="text-sm font-bold uppercase tracking-wider">{dict.startTask}</span>
        </button>
      ) : null}
    </div>
  );
}
