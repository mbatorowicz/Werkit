import type { UnifiedGanttItem } from "@/types/admin";
import type { AppDictionary } from "@/i18n/types";
import { formatCustomerLabel } from "@/lib/customerSearch";

export type GanttBarDimensions = { left: string; width: string };

export type GanttDimensionsContext = {
  dStart: Date;
  dEnd: Date;
  startHour: number;
  totalHours: number;
};

export function ganttItemTimeRange(item: UnifiedGanttItem): { tStart: Date; tEnd: Date } | null {
  const tStart = item.startTime
    ? new Date(item.startTime)
    : item.dueDate
      ? new Date(item.dueDate)
      : null;
  if (!tStart) return null;
  const tEnd = item.endTime
    ? new Date(item.endTime as string)
    : item.status === "IN_PROGRESS"
      ? new Date()
      : item.dueDate
        ? new Date(
            new Date(item.dueDate as string).getTime() +
              Number(item.expectedDurationHours || 2) * 3600000
          )
        : tStart;
  return { tStart, tEnd };
}

export function ganttItemMatchesRow(
  item: UnifiedGanttItem,
  groupBy: "WORKER" | "MACHINE",
  rowId: number
): boolean {
  return groupBy === "WORKER" ? item.userId === rowId : item.resourceId === rowId;
}

export function ganttItemVisibleInRange(item: UnifiedGanttItem, dStart: Date, dEnd: Date): boolean {
  const range = ganttItemTimeRange(item);
  if (!range) return false;
  return range.tStart <= dEnd && range.tEnd >= dStart;
}

export function ganttRowsAllEmpty(
  rows: { id: number }[],
  unifiedItems: UnifiedGanttItem[],
  groupBy: "WORKER" | "MACHINE",
  dStart: Date,
  dEnd: Date
): boolean {
  return rows.every(
    (row) =>
      !unifiedItems.some(
        (item) =>
          ganttItemMatchesRow(item, groupBy, row.id) && ganttItemVisibleInRange(item, dStart, dEnd)
      )
  );
}

export function getGanttDimensions(
  start: Date,
  durationHours: number,
  ctx: GanttDimensionsContext
): GanttBarDimensions | null {
  const { dStart, dEnd, startHour, totalHours } = ctx;
  let itemStartMs = start.getTime();
  let itemEndMs = itemStartMs + durationHours * 3600000;

  if (itemEndMs <= dStart.getTime() || itemStartMs >= dEnd.getTime()) {
    return null;
  }

  if (itemStartMs < dStart.getTime()) {
    itemStartMs = dStart.getTime();
  }
  if (itemEndMs > dEnd.getTime()) {
    itemEndMs = dEnd.getTime();
  }

  const visibleDurationHours = (itemEndMs - itemStartMs) / 3600000;
  if (visibleDurationHours <= 0) return null;

  const visibleStart = new Date(itemStartMs);
  const startMinsFromStartHour =
    (visibleStart.getHours() - startHour) * 60 + visibleStart.getMinutes();

  const totalMins = totalHours * 60;

  const left = (startMinsFromStartHour / totalMins) * 100;
  const width = ((visibleDurationHours * 60) / totalMins) * 100;

  return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
}

export function createGanttItemTooltip(
  fields: AppDictionary["admin"]["orderFields"]
): (item: UnifiedGanttItem, opts: { date?: string; time?: string; footer: string }) => string {
  return (item, opts) => {
    const customerName = formatCustomerLabel({
      firstName: (item.customerFirstName as string) ?? null,
      lastName: (item.customerLastName as string) ?? null,
    });
    return [
      `#${item.workOrderId || item.id}`,
      `${fields.category}: ${item.categoryName || "—"}`,
      `${fields.resource}: ${item.resourceName || "—"}`,
      `${fields.material}: ${item.materialName || "—"}`,
      `${fields.quantity}: ${item.quantityTons ? `${item.quantityTons}t` : "—"}`,
      `${fields.customer}: ${customerName || "—"}`,
      opts.date ? `${fields.date}: ${opts.date}` : null,
      opts.time ? `${fields.time}: ${opts.time}` : null,
      opts.footer,
    ]
      .filter(Boolean)
      .join("\n");
  };
}

export function computeGanttItemBars(
  item: UnifiedGanttItem,
  getDimensions: (start: Date, durationHours: number) => GanttBarDimensions | null
): {
  plannedStart: Date | null;
  plannedDims: GanttBarDimensions | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  actualDims: GanttBarDimensions | null;
} {
  const plannedStart = item.dueDate ? new Date(item.dueDate) : null;
  const plannedDurationHours = Number(item.expectedDurationHours || 2);

  const actualStart = item.startTime ? new Date(item.startTime) : null;
  const actualEnd = item.endTime
    ? new Date(item.endTime)
    : item.status === "IN_PROGRESS"
      ? new Date()
      : null;

  let plannedDims: GanttBarDimensions | null = null;
  if (plannedStart) {
    plannedDims = getDimensions(plannedStart, plannedDurationHours);
  }

  let actualDims: GanttBarDimensions | null = null;
  if (actualStart) {
    const durationMs = actualEnd ? actualEnd.getTime() - actualStart.getTime() : 0;
    const durationHours = durationMs / 3600000;
    actualDims = getDimensions(actualStart, Math.max(0.2, durationHours));
  }

  return { plannedStart, plannedDims, actualStart, actualEnd, actualDims };
}
