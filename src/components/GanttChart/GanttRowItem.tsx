"use client";

import { UnifiedGanttItem } from "@/types/admin";
import { formatUiDateOnly, formatUiTimeHm } from "@/i18n";
import { adminDispatchOpenUrl } from "@/lib/appRoutes";
import {
  computeGanttItemBars,
  type GanttBarDimensions,
} from "@/components/GanttChart/ganttTimeMath";

export interface GanttRowItemProps {
  item: UnifiedGanttItem;
  onItemClick?: (item: UnifiedGanttItem) => void;
  formatItemTooltip: (
    item: UnifiedGanttItem,
    opts: { date?: string; time?: string; footer: string }
  ) => string;
  getDimensions: (start: Date, durationHours: number) => GanttBarDimensions | null;
  dict: Record<string, string>;
}

export function GanttRowItem({
  item,
  onItemClick,
  formatItemTooltip,
  getDimensions,
  dict,
}: GanttRowItemProps) {
  const { plannedStart, plannedDims, actualStart, actualEnd, actualDims } = computeGanttItemBars(
    item,
    getDimensions
  );

  if (!plannedDims && !actualDims) return null;

  return (
    <div
      onClick={() => {
        if (onItemClick) {
          onItemClick(item);
        } else {
          window.location.assign(adminDispatchOpenUrl(item.workOrderId || item.id));
        }
      }}
      className="block cursor-pointer"
    >
      {plannedDims && (
        <div
          className="absolute top-1 bottom-1 border-2 border-dashed border-amber-500/50 rounded-md bg-amber-500/20 flex items-center px-2 overflow-hidden cursor-pointer hover:z-20 hover:scale-[1.02] transition"
          style={{ left: plannedDims.left, width: plannedDims.width }}
          title={formatItemTooltip(item, {
            date: plannedStart ? formatUiDateOnly(plannedStart) : "—",
            time: plannedStart ? formatUiTimeHm(plannedStart) : "—",
            footer: dict.clickToEdit,
          })}
        >
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500 whitespace-nowrap truncate">
            #{item.workOrderId || item.id}
          </span>
        </div>
      )}
      {actualDims && (
        <div
          className={`absolute top-2.5 bottom-2.5 rounded shadow-sm flex items-center px-2 overflow-hidden cursor-pointer hover:z-20 hover:scale-[1.02] transition ${item.status === "IN_PROGRESS" ? "bg-blue-500 dark:bg-blue-600 animate-pulse" : "bg-emerald-500 dark:bg-emerald-600"}`}
          style={{ left: actualDims.left, width: actualDims.width }}
          title={formatItemTooltip(item, {
            date: actualStart ? formatUiDateOnly(actualStart) : "—",
            time: `${actualStart ? formatUiTimeHm(actualStart) : "—"} – ${actualEnd ? formatUiTimeHm(actualEnd) : dict.inProgressShort}`,
            footer: dict.clickToDetails,
          })}
        >
          <span className="text-[10px] font-bold text-white whitespace-nowrap truncate">
            #{item.workOrderId || item.id}
          </span>
        </div>
      )}
    </div>
  );
}
