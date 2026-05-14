import { formatUiDateOnly, formatUiTimeHm } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import type { UnifiedGanttItem } from "@/types/admin";

type OrdersDict = AppDictionary["admin"]["orders"];
type ArchiveDict = AppDictionary["admin"]["archive"];
type WorkerClient = AppDictionary["worker"]["client"];

export type DispatchItemCardLayout = "table" | "boardPending" | "boardActive" | "boardDone";

export function dispatchStatusTone(status: UnifiedGanttItem["status"]) {
  if (status === "PENDING") return "planned" as const;
  if (status === "IN_PROGRESS") return "active" as const;
  return "done" as const;
}

export function dispatchStatusPillClass(status: UnifiedGanttItem["status"]) {
  if (status === "PENDING")
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20";
  if (status === "IN_PROGRESS")
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20";
  return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20";
}

export function dispatchStatusLabel(
  status: UnifiedGanttItem["status"],
  ordersDict: OrdersDict,
  archiveDict: ArchiveDict,
) {
  if (status === "PENDING") return ordersDict.pending;
  if (status === "IN_PROGRESS") return archiveDict.inProgress;
  return archiveDict.completed;
}

export function computeDispatchInProgressPercent(
  item: UnifiedGanttItem,
  liveClockMs: number | null,
): number {
  if (item.status !== "IN_PROGRESS" || !item._sortDate || liveClockMs === null) return 0;
  const start = new Date(item._sortDate as number).getTime();
  const elapsedMs = liveClockMs - start;
  const expectedMs = Number(item.expectedDurationHours || 8) * 60 * 60 * 1000;
  return Math.min(100, Math.round((elapsedMs / expectedMs) * 100));
}

type ItemStatus = NonNullable<UnifiedGanttItem["status"]>;

export function sortUnifiedDispatchTableRows(items: UnifiedGanttItem[]): UnifiedGanttItem[] {
  const statusRank: Record<ItemStatus, number> = {
    PENDING: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
  };
  return [...items].sort((a, b) => {
    const ra = a.status ? (statusRank[a.status as ItemStatus] ?? 9) : 9;
    const rb = b.status ? (statusRank[b.status as ItemStatus] ?? 9) : 9;
    if (ra !== rb) return ra - rb;
    const da =
      (a._sortDate as number | undefined) ?? Date.parse(String(a.dueDate ?? a.startTime ?? a.createdAt ?? 0));
    const db =
      (b._sortDate as number | undefined) ?? Date.parse(String(b.dueDate ?? b.startTime ?? b.createdAt ?? 0));
    return (db || 0) - (da || 0);
  });
}

export function buildDispatchItemCardCopy(
  item: UnifiedGanttItem,
  ordersDict: OrdersDict,
  workerUiLabels: WorkerClient,
) {
  const orderNo = `#${item.workOrderId || item.id}`;
  const mode = (item.categoryName || workerUiLabels.noCategoryName) as string;
  const machine = ((item.resourceName as string) || ordersDict.noMachine) as string;
  const material = (item.materialName as string) || "";
  const qty = item.quantityTons ? `${item.quantityTons}t` : "";
  const customer = [
    item.customerLastName ? (item.customerLastName as string) : "",
    item.customerFirstName ? (item.customerFirstName as string) : "",
  ]
    .join(" ")
    .trim();
  const desc = (item.taskDescription as string) || "";
  return { orderNo, mode, machine, material, qty, customer, desc };
}

export function dispatchItemDateTimeLabels(
  item: UnifiedGanttItem,
  layout: DispatchItemCardLayout,
  liveClockMs: number | null,
): { dateLabel: string; timeLabel: string } {
  if (layout === "boardActive") {
    const tStart = item.startTime ? new Date(item.startTime as string) : null;
    const dateLabel = tStart
      ? formatUiDateOnly(tStart)
      : formatUiDateOnly(item.createdAt as string);
    const timeLabel = tStart
      ? `${formatUiTimeHm(tStart)} – ${
          liveClockMs !== null ? formatUiTimeHm(new Date(liveClockMs)) : ""
        }`
      : "—";
    return { dateLabel, timeLabel };
  }

  if (layout === "boardDone") {
    const tStart = item.startTime ? new Date(item.startTime as string) : null;
    const tEnd = item.endTime ? new Date(item.endTime as string) : null;
    const dateLabel = tStart
      ? formatUiDateOnly(tStart)
      : formatUiDateOnly(item.createdAt as string);
    const timeLabel = tStart
      ? `${formatUiTimeHm(tStart)}${
          tEnd ? ` – ${formatUiTimeHm(tEnd)}` : ""
        }`
      : "—";
    return { dateLabel, timeLabel };
  }

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
    ? formatUiDateOnly(tStart)
    : formatUiDateOnly(item.createdAt as string);
  const timeLabel = tStart
    ? `${formatUiTimeHm(tStart)}${
        tEnd ? ` – ${formatUiTimeHm(tEnd)}` : ""
      }`
    : "";

  return { dateLabel, timeLabel };
}
