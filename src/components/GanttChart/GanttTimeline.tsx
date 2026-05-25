"use client";

import { formatUiTimeHm } from "@/i18n";

type Props = {
  startHour: number;
  totalHours: number;
  hours: number[];
  currentTimeLeft: number | null;
  currentTime: Date | null;
  groupBy: 'WORKER' | 'MACHINE';
  dict: Record<string, string>;
};

export function GanttTimeline({
  startHour,
  totalHours,
  hours,
  currentTimeLeft,
  currentTime,
  groupBy,
  dict,
}: Props) {
  return (
    <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 sticky top-0 z-30">
      <div className="w-40 md:w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-700 p-2 bg-zinc-50 dark:bg-[#0a0a0b] flex items-center sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          {groupBy === "WORKER" ? dict.groupByWorker : dict.groupByResource}
        </span>
      </div>
      <div className="flex-1 relative h-10">
        {hours.map(h => (
          <div key={h} className="absolute top-0 bottom-0 border-l border-zinc-100 dark:border-zinc-800/50" style={{ left: `${((h - startHour) / totalHours) * 100}%` }}>
            <span className="text-[10px] text-zinc-400 absolute -left-2.5 top-2 bg-white dark:bg-zinc-900 px-1">{h.toString().padStart(2, '0')}:00</span>
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
