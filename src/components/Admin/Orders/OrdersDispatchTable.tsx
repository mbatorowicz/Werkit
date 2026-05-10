"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Map, Trash2 } from "lucide-react";
import { DEFAULT_UI_LOCALE, formatDict } from "@/i18n";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { normalizeWorkOrderPriority } from "@/features/worker/lib/workOrderPriority";
import type { AppDictionary } from "@/i18n/types";
import type { UnifiedGanttItem } from "@/types/admin";

type OrdersDict = AppDictionary["admin"]["orders"];
type ArchiveDict = AppDictionary["admin"]["archive"];
type WorkerClient = AppDictionary["worker"]["client"];

export function OrdersDispatchTable({
  ordersDict,
  archiveDict,
  workerUiLabels,
  canMutate,
  isLoading,
  tableColSpan,
  tableLimit,
  unifiedItems,
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
  onRowClick: (item: UnifiedGanttItem) => void;
  onDeleteWorkOrder: (id: number) => Promise<void>;
  onForceCompleteSession: (sessionId: number) => Promise<void>;
  onDeleteArchivedSession: (sessionId: number) => Promise<void>;
}) {
  const dict = ordersDict;
  /** Clock poza renderem — unika Date.now() podczas czystego renderu (React Compiler). */
  const [liveClockMs, setLiveClockMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLiveClockMs(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b]">
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {dict.workerDate}
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {archiveDict.machine}
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {dict.taskDeadlineColumn}
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                {archiveDict.status}
              </th>
              {canMutate && (
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right w-[140px]">
                  {dict.actionsColumn}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
            {isLoading ? (
              <tr>
                <td colSpan={tableColSpan} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                  {dict.fetching}
                </td>
              </tr>
            ) : unifiedItems.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Map className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                    <h3 className="text-zinc-900 dark:text-zinc-300 font-medium">{dict.emptyStateTitle}</h3>
                    <p className="text-zinc-500 text-sm mt-2 max-w-md">{dict.emptyStateDesc}</p>
                  </div>
                </td>
              </tr>
            ) : (
              unifiedItems.slice(0, tableLimit).map((item) => {
                const isWorking = item.status === "IN_PROGRESS";
                let progress = 0;
                if (isWorking && item._sortDate && liveClockMs !== null) {
                  const start = new Date(item._sortDate as number).getTime();
                  const elapsedMs = liveClockMs - start;
                  const expectedMs = Number(item.expectedDurationHours || 8) * 60 * 60 * 1000;
                  progress = Math.min(100, Math.round((elapsedMs / expectedMs) * 100));
                }
                return (
                  <tr
                    key={`${item._type}-${item.id}`}
                    onClick={() => onRowClick(item)}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors relative group ${
                      item._type === "SESSION" || canMutate ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 mr-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                          #{item.workOrderId || item.id}
                        </div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-200">{item.workerName as string}</div>
                        {item._type === "ORDER" && (
                          <WorkOrderPriorityRibbon
                            priority={normalizeWorkOrderPriority(item.priority ?? undefined)}
                            labels={workerUiLabels}
                          />
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {item._type === "ORDER"
                          ? `${new Date(item.createdAt as string).toLocaleDateString(DEFAULT_UI_LOCALE)} ${new Date(item.createdAt as string).toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })}`
                          : `${new Date(item.startTime as string).toLocaleDateString(DEFAULT_UI_LOCALE)} ${new Date(item.startTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })}`}
                        {item.endTime &&
                          ` - ${new Date(item.endTime as string).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                      </div>
                      {item.creatorName && (
                        <div className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">
                          {dict.orderedBy} <span className="font-medium text-zinc-500">{item.creatorName}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                      {(item.resourceName as string) || dict.noMachine}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-900 dark:text-zinc-200">
                        {item.categoryName || workerUiLabels.noCategoryName}
                      </div>
                      {item.materialName && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {item.materialName as string}{" "}
                          {item.quantityTons ? `(${item.quantityTons}t)` : ""}{" "}
                          {item.customerLastName ? `→ ${item.customerLastName}` : ""}{" "}
                          {item.customerFirstName ? (item.customerFirstName as string) : ""}
                        </div>
                      )}
                      {item.taskDescription && (
                        <div className="text-xs text-zinc-500 mt-0.5 max-w-xs truncate" title={item.taskDescription as string}>
                          {item.taskDescription as string}
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 mt-2">
                        {(item.expectedDurationHours || item.dueDate) && (
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
                          </div>
                        )}

                        {item.status === "COMPLETED" && item.startTime && item.endTime && (
                          <div className="flex items-center gap-2 flex-wrap">
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
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-500/20 inline-block px-1.5 py-0.5 rounded">
                              {(() => {
                                const diff =
                                  new Date(item.endTime as string).getTime() -
                                  new Date(item.startTime as string).getTime();
                                const h = Math.floor(diff / (1000 * 60 * 60));
                                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                return `${dict.durationTotal}: ${h}h ${m}m`;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            item.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20"
                              : item.status === "IN_PROGRESS"
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20"
                          }`}
                        >
                          {item.status === "PENDING"
                            ? dict.pending
                            : item.status === "IN_PROGRESS"
                              ? archiveDict.inProgress
                              : archiveDict.completed}
                        </span>
                        {isWorking && (
                          <div className="mt-3 w-full max-w-[140px]">
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
                    </td>
                    {canMutate && (
                      <td className="px-6 py-4 text-right align-middle" onClick={(e) => e.stopPropagation()}>
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
                );
              })
            )}
          </tbody>
        </table>
    </div>
  );
}
