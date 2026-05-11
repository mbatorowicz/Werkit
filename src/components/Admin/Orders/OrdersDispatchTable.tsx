"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Map } from "lucide-react";
import type { DispatchViewMode } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import type { AppDictionary } from "@/i18n/types";
import type { UnifiedGanttItem } from "@/types/admin";
import { sortUnifiedDispatchTableRows } from "@/features/admin/orders/dispatchTableUi";
import { OrdersDispatchItemCard } from "@/components/Admin/Orders/OrdersDispatchItemCard";

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
  children: ReactNode;
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
  tableColSpan: _tableColSpan,
  tableLimit,
  unifiedItems,
  viewMode,
  page,
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
  page: number;
  onRowClick: (item: UnifiedGanttItem) => void;
  onDeleteWorkOrder: (id: number) => Promise<void>;
  onForceCompleteSession: (sessionId: number) => Promise<void>;
  onDeleteArchivedSession: (sessionId: number) => Promise<void>;
}) {
  void _tableColSpan;
  void onDeleteWorkOrder;
  void onForceCompleteSession;
  void onDeleteArchivedSession;

  const dict = ordersDict;
  const [liveClockMs, setLiveClockMs] = useState<number | null>(null);

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

  const plannedAll = unifiedItems.filter((i) => i.status === "PENDING");
  const activeAll = unifiedItems.filter((i) => i.status === "IN_PROGRESS");
  const doneAll = unifiedItems.filter((i) => i.status === "COMPLETED");

  if (viewMode === "table") {
    const sortedItems = sortUnifiedDispatchTableRows(unifiedItems);
    const start = Math.max(0, (Math.max(1, page) - 1) * Math.max(1, tableLimit));
    const pageItems = sortedItems.slice(start, start + Math.max(1, tableLimit));
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b]">
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {dict.workerDate}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
            {pageItems.map((item) => (
              <tr
                key={`${item._type}-${item.id}`}
                onClick={() => onRowClick(item)}
                className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors ${
                  item._type === "SESSION" || canMutate ? "cursor-pointer" : ""
                }`}
              >
                <td className="px-6 py-4">
                  <OrdersDispatchItemCard
                    item={item}
                    layout="table"
                    liveClockMs={liveClockMs}
                    ordersDict={ordersDict}
                    archiveDict={archiveDict}
                    workerUiLabels={workerUiLabels}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const planned = plannedAll.slice(0, tableLimit);
  const active = activeAll.slice(0, tableLimit);
  const done = doneAll.slice(0, tableLimit);

  const cardProps = {
    liveClockMs,
    ordersDict,
    archiveDict,
    workerUiLabels,
  };

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DispatchColumn title={dict.pending} count={planned.length}>
          {planned.map((item) => (
            <div
              key={`${item._type}-${item.id}`}
              onClick={() => onRowClick(item)}
              className={item._type === "SESSION" || canMutate ? "cursor-pointer" : ""}
            >
              <OrdersDispatchItemCard item={item} layout="boardPending" {...cardProps} />
            </div>
          ))}
        </DispatchColumn>

        <DispatchColumn title={archiveDict.inProgress} count={active.length}>
          {active.map((item) => (
            <div
              key={`${item._type}-${item.id}`}
              onClick={() => onRowClick(item)}
              className={item._type === "SESSION" || canMutate ? "cursor-pointer" : ""}
            >
              <OrdersDispatchItemCard item={item} layout="boardActive" {...cardProps} />
            </div>
          ))}
        </DispatchColumn>

        <DispatchColumn title={archiveDict.completed} count={done.length}>
          {done.map((item) => (
            <div
              key={`${item._type}-${item.id}`}
              onClick={() => onRowClick(item)}
              className={item._type === "SESSION" || canMutate ? "cursor-pointer" : ""}
            >
              <OrdersDispatchItemCard item={item} layout="boardDone" {...cardProps} />
            </div>
          ))}
        </DispatchColumn>
      </div>
    </div>
  );
}
