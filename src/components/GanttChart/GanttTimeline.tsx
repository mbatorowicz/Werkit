"use client";

import { formatUiTimeHm } from "@/i18n";
import { cn } from "@/lib/cn";
import { GANTT_LABEL_COL, type GanttDensity } from "@/components/GanttChart/ganttLayout";

type Props = {
  startHour: number;
  totalHours: number;
  hours: number[];
  currentTimeLeft: number | null;
  currentTime: Date | null;
  groupBy: "WORKER" | "MACHINE";
  dict: Record<string, string>;
  density?: GanttDensity;
};

export function GanttTimeline({
  startHour,
  totalHours,
  hours,
  currentTimeLeft,
  currentTime,
  groupBy,
  dict,
  density = "inline",
}: Props) {
  return (
    <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 sticky top-0 z-30">
      <div
        className={cn(
          "sticky left-0 z-40 flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 p-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:border-zinc-700 dark:bg-zinc-950/80 dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]",
          GANTT_LABEL_COL[density]
        )}
      >
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          {groupBy === "WORKER" ? dict.groupByWorker : dict.groupByResource}
        </span>
      </div>
      <div className="flex-1 relative h-10">
        {hours.map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-zinc-100 dark:border-zinc-800/50"
            style={{ left: `${((h - startHour) / totalHours) * 100}%` }}
          >
            <span className="text-[10px] text-zinc-400 absolute -left-2.5 top-2 bg-white dark:bg-zinc-900 px-1">
              {h.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
        {currentTimeLeft !== null && (
          <div
            className="absolute top-0 bottom-0 border-l border-red-400/40 z-20"
            style={{ left: `${currentTimeLeft}%` }}
          >
            <div className="absolute -left-5 top-1 px-1.5 py-0.5 bg-red-400/80 dark:bg-red-500/60 text-white/90 text-[9px] font-semibold rounded-sm whitespace-nowrap shadow-sm">
              {currentTime ? formatUiTimeHm(currentTime) : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
