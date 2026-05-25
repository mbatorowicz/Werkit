"use client";

type Props = {
  dict: Record<string, string>;
};

export function GanttLegend({ dict }: Props) {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-[#0a0a0b] border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-6 text-xs text-zinc-600 dark:text-zinc-400">
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 border-2 border-dashed border-amber-500/50 bg-amber-500/20 rounded-sm"></div>
        <span>{dict.plannedWorkTime}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 bg-blue-500 rounded-sm animate-pulse"></div>
        <span>{dict.inProgressLegend}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 bg-emerald-500 rounded-sm"></div>
        <span>{dict.completedLegend}</span>
      </div>
    </div>
  );
}
