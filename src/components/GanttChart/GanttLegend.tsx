"use client";

import { uiStatusToneClasses } from "@/lib/uiStatus";
import { cn } from "@/lib/cn";

type Props = {
  dict: Record<string, string>;
  compact?: boolean;
};

export function GanttLegend({ dict, compact = false }: Props) {
  const inProgressFill = uiStatusToneClasses("active").fill;
  const doneFill = uiStatusToneClasses("done").fill;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center border-t border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-400",
        compact ? "gap-3 p-2" : "gap-6 p-3"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 border-2 border-dashed border-amber-500/50 bg-amber-500/20 rounded-sm"></div>
        <span>{dict.plannedWorkTime}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-3 rounded-sm animate-pulse ${inProgressFill}`}></div>
        <span>{dict.inProgressLegend}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-3 rounded-sm ${doneFill}`}></div>
        <span>{dict.completedLegend}</span>
      </div>
    </div>
  );
}
