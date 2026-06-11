"use client";

import { UnifiedGanttItem, BaseWorker, BaseMachine } from "@/types/admin";
import { GanttRowItem } from "@/components/GanttChart/GanttRowItem";
import {
  ganttItemMatchesRow,
  ganttItemVisibleInRange,
} from "@/components/GanttChart/ganttTimeMath";

type Props = {
  row: BaseWorker | BaseMachine;
  groupBy: "WORKER" | "MACHINE";
  unifiedItems: UnifiedGanttItem[];
  dStart: Date;
  dEnd: Date;
  startHour: number;
  totalHours: number;
  hours: number[];
  currentTimeLeft: number | null;
  currentTime: Date | null;
  onItemClick?: (item: UnifiedGanttItem) => void;
  formatItemTooltip: (
    item: UnifiedGanttItem,
    opts: { date?: string; time?: string; footer: string }
  ) => string;
  getDimensions: (start: Date, durationHours: number) => { left: string; width: string } | null;
  dict: Record<string, string>;
};

export function GanttRow({
  row,
  groupBy,
  unifiedItems,
  dStart,
  dEnd,
  startHour: _startHour,
  totalHours: _totalHours,
  hours: _hours,
  currentTimeLeft: _currentTimeLeft,
  currentTime: _currentTime,
  onItemClick,
  formatItemTooltip,
  getDimensions,
  dict,
}: Props) {
  const rowItems = unifiedItems.filter(
    (item) =>
      ganttItemMatchesRow(item, groupBy, row.id) && ganttItemVisibleInRange(item, dStart, dEnd)
  );

  if (rowItems.length === 0) return null;

  return (
    <div className="flex border-b border-zinc-100 dark:border-zinc-800/50 group hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
      <div className="w-40 md:w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 flex flex-col justify-center sticky left-0 z-20 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/20 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
        <span
          className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate"
          title={"fullName" in row ? row.fullName : row.name}
        >
          {"fullName" in row ? row.fullName : row.name}
        </span>
      </div>
      <div className="flex-1 relative h-10 my-1">
        {rowItems.map((item) => (
          <GanttRowItem
            key={`${item._type}-${item.id}`}
            item={item}
            onItemClick={onItemClick}
            formatItemTooltip={formatItemTooltip}
            getDimensions={getDimensions}
            dict={dict}
          />
        ))}
      </div>
    </div>
  );
}
