"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Map, Trash2 } from "lucide-react";
import { DEFAULT_UI_LOCALE, formatDict } from "@/i18n";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { normalizeWorkOrderPriority } from "@/features/worker/lib/workOrderPriority";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import type { DispatchViewMode } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import type { AppDictionary } from "@/i18n/types";
import type { UnifiedGanttItem } from "@/types/admin";

type OrdersDict = AppDictionary["admin"]["orders"];
type ArchiveDict = AppDictionary["admin"]["archive"];
type WorkerClient = AppDictionary["worker"]["client"];

function DispatchColumn({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
          {title}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{count}</div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function OrdersDispatchTable({
  ordersDict,
  archiveDict,
  workerUiLabels,
  canMutate,
  isLoading,
  tableColSpan: _tableColSpan, // zgodność API (fallback-y w parent), nieużywane w układzie board
  tableLimit,
  unifiedItems,
  viewMode,
  onRowClick,
  onDeleteWorkOrder,
  onForceCompleteSession,
  onDeleteArchivedSession,
}: {
  ordersDict: OrdersDict;
  archiveDict: ArchiveDict;
  workerUiLabels: WorkerClient;
  canMutate: boolean;
  isLoading: boolean;
  tableColSpan: number;
  tableLimit: number;
  unifiedItems: UnifiedGanttItem[];
  viewMode: DispatchViewMode;
  onRowClick: (item: UnifiedGanttItem) => void;
  onDeleteWorkOrder: (id: number) => Promise<void>;
  onForceCompleteSession: (sessionId: number) => Promise<void>;
  onDeleteArchivedSession: (sessionId: number) => Promise<void>;
}) {
  void _tableColSpan;
  const dict = ordersDict;
  /** Clock poza renderem — unika Date.now() podczas czystego renderu (React Compiler). */
  const [liveClockMs, setLiveClockMs] = useState<number | null>(null);

  const statusTone = (status: UnifiedGanttItem["status"]) => {
    // planned / in progress / done
    if (status === "PENDING") return "planned";
    if (status === "IN_PROGRESS") return "active";
    return "done";
  };

  const statusPillClass = (status: UnifiedGanttItem["status"]) => {
    if (status === "PENDING")
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20";
    if (status === "IN_PROGRESS")
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20";
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20";
  };

  const statusLabel = (status: UnifiedGanttItem["status"]) => {
    if (status === "PENDING") return dict.pending;
    if (status === "IN_PROGRESS") return archiveDict.inProgress;
    return archiveDict.completed;
  };

  useEffect(() => {
    const tick = () => setLiveClockMs(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
        {dict.fetching}
      </div>
    );
  }

  if (unifiedItems.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="flex flex-col items-center justify-center">
          <Map className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-zinc-900 dark:text-zinc-300 font-medium">{dict.emptyStateTitle}</h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-md">{dict.emptyStateDesc}</p>
        </div>
      </div>
    );
  }

  const items = unifiedItems.slice(0, tableLimit);
  const planned = items.filter((i) => i.status === "PENDING");
  const active = items.filter((i) => i.status === "IN_PROGRESS");
  const done = items.filter((i) => i.status === "COMPLETED");

  const renderCard = (item: UnifiedGanttItem) => {
    const isWorking = item.status === "IN_PROGRESS";
    const tone = statusTone(item.status);
    let progress = 0;
    if (isWorking && item._sortDate && liveClockMs !== null) {
      const start = new Date(item._sortDate as number).getTime();
      const elapsedMs = liveClockMs - start;
      const expectedMs = Number(item.expectedDurationHours || 8) * 60 * 60 * 1000;
      progress = Math.min(100, Math.round((elapsedMs / expectedMs) * 100));
    }

    const orderNo = `#${item.workOrderId || item.id}`;
    const mode = (item.categoryName || workerUiLabels.noCategoryName) as string;
    const machine = ((item.resourceName as string) || dict.noMachine) as string;
    const material = (item.materialName as string) || "";
    const qty = item.quantityTons ? `${item.quantityTons}t` : "";
    const customer = [
      item.customerLastName ? (item.customerLastName as string) : "",
      item.customerFirstName ? (item.customerFirstName as string) : "",
    ]
      .join(" ")
      .trim();
    const desc = (item.taskDescription as string) || "";

    const tStart =
      item.status === "PENDING"
        ? item.dueDate
          ? new Date(item.dueDate as string)
          : new Date(item.createdAt as string)
        : item.startTime
          ? new Date(item.startTime as string)
          : null;
    const tEnd =
      item.status === "COMPLETED" && item.endTime
        ? new Date(item.endTime as string)
        : item.status === "IN_PROGRESS" && item.startTime && liveClockMs !== null
          ? new Date(liveClockMs)
          : item.status === "PENDING" && item.dueDate && item.expectedDurationHours
            ? new Date(
                new Date(item.dueDate as string).getTime() +
                  Number(item.expectedDurationHours) * 60 * 60 * 1000,
              )
            : null;

    const dateLabel = tStart
      ? tStart.toLocaleDateString(DEFAULT_UI_LOCALE)
      : new Date(item.createdAt as string).toLocaleDateString(DEFAULT_UI_LOCALE);
    const timeLabel = tStart
      ? `${tStart.toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })}${
          tEnd
            ? ` – ${tEnd.toLocaleTimeString(DEFAULT_UI_LOCALE, {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : ""
        }`
      : "";

    return (
      <OrderLabelCard
        density="compact"
        tone={tone}
        orderNo={orderNo}
        title={item.workerName as string}
        badges={
          <>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusPillClass(
                item.status,
              )}`}
            >
              {statusLabel(item.status)}
            </span>
            {item._type === "ORDER" ? (
              <WorkOrderPriorityRibbon
                priority={normalizeWorkOrderPriority(item.priority ?? undefined)}
                labels={workerUiLabels}
              />
            ) : null}
          </>
        }
        mode={mode}
        machine={machine}
        material={material || "—"}
        quantity={qty || "—"}
        customer={customer || "—"}
        description={desc || "—"}
        dateLabel={dateLabel}
        timeLabel={timeLabel || "—"}
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {item.expectedDurationHours && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">
                  {workerUiLabels.durationLabel} {item.expectedDurationHours}h
                </div>
              )}
              {item.dueDate && (
                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 inline-block px-1.5 py-0.5 rounded">
                  {formatDict(workerUiLabels.term, {
                    date: new Date(item.dueDate as string).toLocaleDateString(DEFAULT_UI_LOCALE),
                    time: new Date(item.dueDate as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })}
                </div>
              )}
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
              {isWorking && (
                <div className="w-[140px]">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>{dict.timeProgressLabel}</span>
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
              )}
            </div>
          </div>
        }
      />
    );
  };

  if (viewMode === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b]">
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {dict.workerDate}
              </th>
              {canMutate && (
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right w-[140px]">
                  {dict.actionsColumn}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
            {items.map((item) => (
              <tr
                key={`${item._type}-${item.id}`}
                onClick={() => onRowClick(item)}
                className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors ${
                  item._type === "SESSION" || canMutate ? "cursor-pointer" : ""
                }`}
              >
                <td className="px-6 py-4">
                  {renderCard(item)}
                  {item.creatorName && (
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 px-1">
                      {dict.orderedBy}{" "}
                      <span className="font-medium text-zinc-500">{item.creatorName}</span>
                    </div>
                  )}
                </td>
                {canMutate && (
                  <td className="px-6 py-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 flex-wrap">
                      {item._type === "ORDER" && (
                        <button
                          type="button"
                          title={dict.titleTooltipDeleteOrder}
                          onClick={() => {
                            if (!dict.deletePendingConfirm || !confirm(dict.deletePendingConfirm)) return;
                            void onDeleteWorkOrder(item.id).catch(() => {});
                          }}
                          className="p-2 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {item._type === "SESSION" && item.status === "IN_PROGRESS" && (
                        <button
                          type="button"
                          title={dict.titleTooltipForceComplete}
                          onClick={() => {
                            if (!dict.forceCompleteConfirm || !confirm(dict.forceCompleteConfirm)) return;
                            void onForceCompleteSession(item.id).catch(() => {});
                          }}
                          className="p-2 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition border border-transparent hover:border-emerald-500/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {item._type === "SESSION" && item.status === "COMPLETED" && (
                        <button
                          type="button"
                          title={dict.titleTooltipDeleteArchive}
                          onClick={() => {
                            if (!dict.deleteArchivedConfirm || !confirm(dict.deleteArchivedConfirm)) return;
                            void onDeleteArchivedSession(item.id).catch(() => {});
                          }}
                          className="p-2 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DispatchColumn title={dict.pending} count={planned.length}>
          {planned.map((item) => {
            const isWorking = item.status === "IN_PROGRESS";
            const tone = statusTone(item.status);
            let progress = 0;
            if (isWorking && item._sortDate && liveClockMs !== null) {
              const start = new Date(item._sortDate as number).getTime();
              const elapsedMs = liveClockMs - start;
              const expectedMs = Number(item.expectedDurationHours || 8) * 60 * 60 * 1000;
              progress = Math.min(100, Math.round((elapsedMs / expectedMs) * 100));
            }

            const orderNo = `#${item.workOrderId || item.id}`;
            const mode = (item.categoryName || workerUiLabels.noCategoryName) as string;
            const machine = ((item.resourceName as string) || dict.noMachine) as string;
            const material = (item.materialName as string) || "";
            const qty = item.quantityTons ? `${item.quantityTons}t` : "";
            const customer = [
              item.customerLastName ? (item.customerLastName as string) : "",
              item.customerFirstName ? (item.customerFirstName as string) : "",
            ]
              .join(" ")
              .trim();
            const desc = (item.taskDescription as string) || "";

            const tStart =
              item.status === "PENDING"
                ? item.dueDate
                  ? new Date(item.dueDate as string)
                  : new Date(item.createdAt as string)
                : item.startTime
                  ? new Date(item.startTime as string)
                  : null;
            const tEnd =
              item.status === "COMPLETED" && item.endTime
                ? new Date(item.endTime as string)
                : item.status === "IN_PROGRESS" && item.startTime && liveClockMs !== null
                  ? new Date(liveClockMs)
                  : item.status === "PENDING" && item.dueDate && item.expectedDurationHours
                    ? new Date(
                        new Date(item.dueDate as string).getTime() +
                          Number(item.expectedDurationHours) * 60 * 60 * 1000,
                      )
                    : null;

            const dateLabel = tStart
              ? tStart.toLocaleDateString(DEFAULT_UI_LOCALE)
              : new Date(item.createdAt as string).toLocaleDateString(DEFAULT_UI_LOCALE);
            const timeLabel = tStart
              ? `${tStart.toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })}${
                  tEnd
                    ? ` – ${tEnd.toLocaleTimeString(DEFAULT_UI_LOCALE, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""
                }`
              : "";

            return (
              <div
                key={`${item._type}-${item.id}`}
                onClick={() => onRowClick(item)}
                className={item._type === "SESSION" || canMutate ? "cursor-pointer" : ""}
              >
                <OrderLabelCard
                  density="compact"
                  tone={tone}
                  orderNo={orderNo}
                  title={item.workerName as string}
                  badges={
                    <>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusPillClass(
                          item.status,
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      {item._type === "ORDER" ? (
                        <WorkOrderPriorityRibbon
                          priority={normalizeWorkOrderPriority(item.priority ?? undefined)}
                          labels={workerUiLabels}
                        />
                      ) : null}
                    </>
                  }
                  mode={mode}
                  machine={machine}
                  material={material || "—"}
                  quantity={qty || "—"}
                  customer={customer || "—"}
                  description={desc || "—"}
                  dateLabel={dateLabel}
                  timeLabel={timeLabel || "—"}
                  footer={
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.expectedDurationHours && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">
                            {workerUiLabels.durationLabel} {item.expectedDurationHours}h
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 inline-block px-1.5 py-0.5 rounded">
                            {formatDict(workerUiLabels.term, {
                              date: new Date(item.dueDate as string).toLocaleDateString(DEFAULT_UI_LOCALE),
                              time: new Date(item.dueDate as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                                hour: "2-digit",
                                minute: "2-digit",
                              }),
                            })}
                          </div>
                        )}
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
                        {isWorking && (
                          <div className="w-[140px]">
                            <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                              <span>{dict.timeProgressLabel}</span>
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
                        )}
                      </div>

                      {canMutate && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {item._type === "ORDER" && (
                            <button
                              type="button"
                              title={dict.titleTooltipDeleteOrder}
                              onClick={() => {
                                if (!dict.deletePendingConfirm || !confirm(dict.deletePendingConfirm)) return;
                                void onDeleteWorkOrder(item.id).catch(() => {});
                              }}
                              className="p-2 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
                {item.creatorName && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 px-1">
                    {dict.orderedBy}{" "}
                    <span className="font-medium text-zinc-500">{item.creatorName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </DispatchColumn>

        <DispatchColumn title={archiveDict.inProgress} count={active.length}>
          {active.map((item) => {
            // reuse planned rendering by delegating to same JSX via minimal duplication
            // (kept inline to avoid extra components; static DispatchColumn is already hoisted)
            const isWorking = item.status === "IN_PROGRESS";
            const tone = statusTone(item.status);
            let progress = 0;
            if (isWorking && item._sortDate && liveClockMs !== null) {
              const start = new Date(item._sortDate as number).getTime();
              const elapsedMs = liveClockMs - start;
              const expectedMs = Number(item.expectedDurationHours || 8) * 60 * 60 * 1000;
              progress = Math.min(100, Math.round((elapsedMs / expectedMs) * 100));
            }

            const orderNo = `#${item.workOrderId || item.id}`;
            const mode = (item.categoryName || workerUiLabels.noCategoryName) as string;
            const machine = ((item.resourceName as string) || dict.noMachine) as string;
            const material = (item.materialName as string) || "";
            const qty = item.quantityTons ? `${item.quantityTons}t` : "";
            const customer = [
              item.customerLastName ? (item.customerLastName as string) : "",
              item.customerFirstName ? (item.customerFirstName as string) : "",
            ]
              .join(" ")
              .trim();
            const desc = (item.taskDescription as string) || "";

            const tStart = item.startTime ? new Date(item.startTime as string) : null;
            const dateLabel = tStart
              ? tStart.toLocaleDateString(DEFAULT_UI_LOCALE)
              : new Date(item.createdAt as string).toLocaleDateString(DEFAULT_UI_LOCALE);
            const timeLabel = tStart
              ? `${tStart.toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })} – ${
                  liveClockMs !== null
                    ? new Date(liveClockMs).toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })
                    : ""
                }`
              : "—";

            return (
              <div
                key={`${item._type}-${item.id}`}
                onClick={() => onRowClick(item)}
                className={item._type === "SESSION" || canMutate ? "cursor-pointer" : ""}
              >
                <OrderLabelCard
                  density="compact"
                  tone={tone}
                  orderNo={orderNo}
                  title={item.workerName as string}
                  badges={
                    <>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusPillClass(
                          item.status,
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      {item._type === "ORDER" ? (
                        <WorkOrderPriorityRibbon
                          priority={normalizeWorkOrderPriority(item.priority ?? undefined)}
                          labels={workerUiLabels}
                        />
                      ) : null}
                    </>
                  }
                  mode={mode}
                  machine={machine}
                  material={material || "—"}
                  quantity={qty || "—"}
                  customer={customer || "—"}
                  description={desc || "—"}
                  dateLabel={dateLabel}
                  timeLabel={timeLabel || "—"}
                  footer={
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.expectedDurationHours && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">
                            {workerUiLabels.durationLabel} {item.expectedDurationHours}h
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 inline-block px-1.5 py-0.5 rounded">
                            {formatDict(workerUiLabels.term, {
                              date: new Date(item.dueDate as string).toLocaleDateString(DEFAULT_UI_LOCALE),
                              time: new Date(item.dueDate as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                                hour: "2-digit",
                                minute: "2-digit",
                              }),
                            })}
                          </div>
                        )}
                        <div className="w-[140px]">
                          <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                            <span>{dict.timeProgressLabel}</span>
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
                      </div>

                      {canMutate && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {item._type === "SESSION" && item.status === "IN_PROGRESS" && (
                            <button
                              type="button"
                              title={dict.titleTooltipForceComplete}
                              onClick={() => {
                                if (!dict.forceCompleteConfirm || !confirm(dict.forceCompleteConfirm)) return;
                                void onForceCompleteSession(item.id).catch(() => {});
                              }}
                              className="p-2 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition border border-transparent hover:border-emerald-500/20"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
                {item.creatorName && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 px-1">
                    {dict.orderedBy}{" "}
                    <span className="font-medium text-zinc-500">{item.creatorName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </DispatchColumn>

        <DispatchColumn title={archiveDict.completed} count={done.length}>
          {done.map((item) => {
            const tone = statusTone(item.status);
            const orderNo = `#${item.workOrderId || item.id}`;
            const mode = (item.categoryName || workerUiLabels.noCategoryName) as string;
            const machine = ((item.resourceName as string) || dict.noMachine) as string;
            const material = (item.materialName as string) || "";
            const qty = item.quantityTons ? `${item.quantityTons}t` : "";
            const customer = [
              item.customerLastName ? (item.customerLastName as string) : "",
              item.customerFirstName ? (item.customerFirstName as string) : "",
            ]
              .join(" ")
              .trim();
            const desc = (item.taskDescription as string) || "";

            const tStart = item.startTime ? new Date(item.startTime as string) : null;
            const tEnd = item.endTime ? new Date(item.endTime as string) : null;
            const dateLabel = tStart
              ? tStart.toLocaleDateString(DEFAULT_UI_LOCALE)
              : new Date(item.createdAt as string).toLocaleDateString(DEFAULT_UI_LOCALE);
            const timeLabel = tStart
              ? `${tStart.toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })}${
                  tEnd
                    ? ` – ${tEnd.toLocaleTimeString(DEFAULT_UI_LOCALE, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""
                }`
              : "—";

            return (
              <div
                key={`${item._type}-${item.id}`}
                onClick={() => onRowClick(item)}
                className={item._type === "SESSION" || canMutate ? "cursor-pointer" : ""}
              >
                <OrderLabelCard
                  density="compact"
                  tone={tone}
                  orderNo={orderNo}
                  title={item.workerName as string}
                  badges={
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusPillClass(
                        item.status,
                      )}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  }
                  mode={mode}
                  machine={machine}
                  material={material || "—"}
                  quantity={qty || "—"}
                  customer={customer || "—"}
                  description={desc || "—"}
                  dateLabel={dateLabel}
                  timeLabel={timeLabel || "—"}
                  footer={
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.expectedDurationHours && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">
                            {workerUiLabels.durationLabel} {item.expectedDurationHours}h
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 inline-block px-1.5 py-0.5 rounded">
                            {formatDict(workerUiLabels.term, {
                              date: new Date(item.dueDate as string).toLocaleDateString(DEFAULT_UI_LOCALE),
                              time: new Date(item.dueDate as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                                hour: "2-digit",
                                minute: "2-digit",
                              }),
                            })}
                          </div>
                        )}
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

                      {canMutate && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {item._type === "SESSION" && item.status === "COMPLETED" && (
                            <button
                              type="button"
                              title={dict.titleTooltipDeleteArchive}
                              onClick={() => {
                                if (!dict.deleteArchivedConfirm || !confirm(dict.deleteArchivedConfirm)) return;
                                void onDeleteArchivedSession(item.id).catch(() => {});
                              }}
                              className="p-2 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
                {item.creatorName && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 px-1">
                    {dict.orderedBy}{" "}
                    <span className="font-medium text-zinc-500">{item.creatorName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </DispatchColumn>
      </div>
    </div>
  );
}
