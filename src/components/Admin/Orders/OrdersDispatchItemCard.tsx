"use client";

import type { ReactNode } from "react";
import { DEFAULT_UI_LOCALE, formatDict } from "@/i18n";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { normalizeWorkOrderPriority } from "@/features/worker/lib/workOrderPriority";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import type { AppDictionary } from "@/i18n/types";
import type { UnifiedGanttItem } from "@/types/admin";
import {
  buildDispatchItemCardCopy,
  computeDispatchInProgressPercent,
  dispatchItemDateTimeLabels,
  dispatchStatusPillClass,
  dispatchStatusLabel,
  dispatchStatusTone,
  type DispatchItemCardLayout,
} from "@/features/admin/orders/dispatchTableUi";

type OrdersDict = AppDictionary["admin"]["orders"];
type ArchiveDict = AppDictionary["admin"]["archive"];
type WorkerClient = AppDictionary["worker"]["client"];

function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="w-[140px]">
      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 relative"
          style={{ width: `${Math.max(5, progress)}%` }}
        >
          <div className="absolute inset-0 bg-white/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function OrdersDispatchItemCard({
  item,
  layout,
  liveClockMs,
  ordersDict,
  archiveDict,
  workerUiLabels,
}: {
  item: UnifiedGanttItem;
  layout: DispatchItemCardLayout;
  liveClockMs: number | null;
  ordersDict: OrdersDict;
  archiveDict: ArchiveDict;
  workerUiLabels: WorkerClient;
}) {
  const dict = ordersDict;
  const tone = dispatchStatusTone(item.status);
  const isWorking = item.status === "IN_PROGRESS";
  const progress = computeDispatchInProgressPercent(item, liveClockMs);
  const { orderNo, mode, machine, material, qty, customer, desc } = buildDispatchItemCardCopy(
    item,
    dict,
    workerUiLabels,
  );
  const { dateLabel, timeLabel } = dispatchItemDateTimeLabels(item, layout, liveClockMs);

  const statusPill = (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${dispatchStatusPillClass(
        item.status,
      )}`}
    >
      {dispatchStatusLabel(item.status, dict, archiveDict)}
    </span>
  );

  const showOrderPriority = layout !== "boardDone" && item._type === "ORDER";

  const badges = (
    <>
      {statusPill}
      {showOrderPriority ? (
        <WorkOrderPriorityRibbon
          priority={normalizeWorkOrderPriority(item.priority ?? undefined)}
          labels={workerUiLabels}
        />
      ) : null}
    </>
  );

  const subheader =
    layout === "table" ? (
      <div className="flex items-center gap-2 flex-wrap">
        {item.expectedDurationHours && (
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">
            {workerUiLabels.durationLabel} {item.expectedDurationHours}h
          </div>
        )}
        {item.dueDate && (
          <div className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-500/10 inline-block px-1.5 py-0.5 rounded">
            {formatDict(workerUiLabels.term, {
              date: new Date(item.dueDate as string).toLocaleDateString(DEFAULT_UI_LOCALE),
              time: new Date(item.dueDate as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </div>
        )}
      </div>
    ) : undefined;

  const durationChipBoard = item.expectedDurationHours ? (
    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">
      {workerUiLabels.durationLabel} {item.expectedDurationHours}h
    </div>
  ) : null;

  const dueChipBoard = item.dueDate ? (
    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 inline-block px-1.5 py-0.5 rounded">
      {formatDict(workerUiLabels.term, {
        date: new Date(item.dueDate as string).toLocaleDateString(DEFAULT_UI_LOCALE),
        time: new Date(item.dueDate as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })}
    </div>
  ) : null;

  const completedStartEnd = (startClass: string, endClass: string) =>
    item.status === "COMPLETED" && item.startTime && item.endTime ? (
      <>
        <div className={`text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded ${startClass}`}>
          {dict.start}:{" "}
          {new Date(item.startTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className={`text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded ${endClass}`}>
          {dict.end}:{" "}
          {new Date(item.endTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </>
    ) : null;

  let footer: ReactNode;

  if (layout === "table") {
    footer = (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {item.status === "COMPLETED" && item.startTime && item.endTime && (
            <>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded">
                {dict.start}:{" "}
                {new Date(item.startTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded">
                {dict.end}:{" "}
                {new Date(item.endTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </>
          )}
          {isWorking && <ProgressBar progress={progress} label={dict.timeProgressLabel} />}
        </div>
      </div>
    );
  } else if (layout === "boardPending") {
    footer = (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {durationChipBoard}
          {dueChipBoard}
          {completedStartEnd("text-emerald-600 dark:text-emerald-400", "text-emerald-600 dark:text-emerald-400")}
          {isWorking && <ProgressBar progress={progress} label={dict.timeProgressLabel} />}
        </div>
      </div>
    );
  } else if (layout === "boardActive") {
    footer = (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {durationChipBoard}
          {dueChipBoard}
          <ProgressBar progress={progress} label={dict.timeProgressLabel} />
        </div>
      </div>
    );
  } else {
    footer = (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {durationChipBoard}
          {dueChipBoard}
          {item.startTime && item.endTime && (
            <>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded">
                {dict.start}:{" "}
                {new Date(item.startTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded">
                {dict.end}:{" "}
                {new Date(item.endTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <OrderLabelCard
      density="compact"
      tone={tone}
      orderNo={orderNo}
      title={item.workerName as string}
      orderedBy={(item.creatorName ?? item.workerName) ?? null}
      orderedByLabel={dict.orderedBy}
      attachmentPhotos={Boolean(item.hasPhotos)}
      attachmentNotes={Boolean(item.hasNotes)}
      badges={badges}
      subheader={subheader}
      showDateTime={false}
      mode={mode}
      machine={machine}
      material={material || "—"}
      quantity={qty || "—"}
      customer={customer || "—"}
      description={desc || "—"}
      dateLabel={dateLabel}
      timeLabel={timeLabel || "—"}
      footer={footer}
    />
  );
}
