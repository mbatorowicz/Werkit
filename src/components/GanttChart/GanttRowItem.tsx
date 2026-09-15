"use client";

import { UnifiedGanttItem } from "@/types/admin";
import { formatUiDateOnly, formatUiTimeHm } from "@/i18n";
import { adminDispatchOpenUrl } from "@/lib/appRoutes";
import {
  computeGanttItemBars,
  type GanttBarDimensions,
} from "@/components/GanttChart/ganttTimeMath";
import { cn } from "@/lib/cn";
import { uiStatusToneClasses } from "@/lib/uiStatus";
import { GANTT_BAR_TEXT, type GanttDensity } from "@/components/GanttChart/ganttLayout";

export interface GanttRowItemProps {
  item: UnifiedGanttItem;
  onItemClick?: (item: UnifiedGanttItem) => void;
  formatItemTooltip: (
    item: UnifiedGanttItem,
    opts: { date?: string; time?: string; footer: string }
  ) => string;
  getDimensions: (start: Date, durationHours: number) => GanttBarDimensions | null;
  dict: Record<string, string>;
  density?: GanttDensity;
}

export function GanttRowItem({
  item,
  onItemClick,
  formatItemTooltip,
  getDimensions,
  dict,
  density = "inline",
}: GanttRowItemProps) {
  const { plannedStart, plannedDims, actualStart, actualEnd, actualDims } = computeGanttItemBars(
    item,
    getDimensions
  );
  const inProgressFill = uiStatusToneClasses("active").fill;
  const doneFill = uiStatusToneClasses("done").fill;

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
          <span
            className={cn(
              GANTT_BAR_TEXT[density],
              "font-bold text-amber-700 dark:text-amber-500 whitespace-nowrap truncate"
            )}
          >
            #{item.workOrderId || item.id}
          </span>
        </div>
      )}
      {actualDims && (
        <div
          className={cn(
            "absolute top-2.5 bottom-2.5 rounded shadow-sm flex items-center px-2 overflow-hidden cursor-pointer hover:z-20 hover:scale-[1.02] transition",
            item.status === "IN_PROGRESS" ? cn(inProgressFill, "animate-pulse") : doneFill
          )}
          style={{ left: actualDims.left, width: actualDims.width }}
          title={formatItemTooltip(item, {
            date: actualStart ? formatUiDateOnly(actualStart) : "—",
            time: `${actualStart ? formatUiTimeHm(actualStart) : "—"} – ${actualEnd ? formatUiTimeHm(actualEnd) : dict.inProgressShort}`,
            footer: dict.clickToDetails,
          })}
        >
          <span
            className={cn(
              GANTT_BAR_TEXT[density],
              "font-bold text-white whitespace-nowrap truncate"
            )}
          >
            #{item.workOrderId || item.id}
          </span>
        </div>
      )}
    </div>
  );
}
