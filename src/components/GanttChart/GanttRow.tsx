"use client";

import { UnifiedGanttItem, BaseWorker, BaseMachine } from "@/types/admin";
import { formatUiDateOnly, formatUiTimeHm } from "@/i18n";
import { adminDispatchOpenUrl } from "@/lib/appRoutes";

type Props = {
  row: BaseWorker | BaseMachine;
  groupBy: 'WORKER' | 'MACHINE';
  unifiedItems: UnifiedGanttItem[];
  dStart: Date;
  dEnd: Date;
  startHour: number;
  totalHours: number;
  hours: number[];
  currentTimeLeft: number | null;
  currentTime: Date | null;
  onItemClick?: (item: UnifiedGanttItem) => void;
  formatItemTooltip: (item: UnifiedGanttItem, opts: { date?: string; time?: string; footer: string }) => string;
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
  const rowItems = unifiedItems.filter(item => {
    const matchesRow = groupBy === 'WORKER' ? item.userId === row.id : item.resourceId === row.id;
    if (!matchesRow) return false;

    const tStart = item.startTime ? new Date(item.startTime) : (item.dueDate ? new Date(item.dueDate) : null);
    if (!tStart) return false;
    const tEnd = item.endTime ? new Date(item.endTime as string) : (item.status === 'IN_PROGRESS' ? new Date() : (item.dueDate ? new Date(new Date(item.dueDate as string).getTime() + Number(item.expectedDurationHours || 2) * 3600000) : tStart));
    return tStart <= dEnd && tEnd >= dStart;
  });

  if (rowItems.length === 0) return null;

  return (
    <div className="flex border-b border-zinc-100 dark:border-zinc-800/50 group hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
      <div className="w-40 md:w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 flex flex-col justify-center sticky left-0 z-20 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/20 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate" title={'fullName' in row ? row.fullName : row.name}>
          {'fullName' in row ? row.fullName : row.name}
        </span>
      </div>
      <div className="flex-1 relative h-10 my-1">
        {rowItems.map(item => {
          const plannedStart = item.dueDate ? new Date(item.dueDate) : null;
          const plannedDurationHours = Number(item.expectedDurationHours || 2);

          const actualStart = item.startTime ? new Date(item.startTime) : null;
          const actualEnd = item.endTime ? new Date(item.endTime) : (item.status === 'IN_PROGRESS' ? new Date() : null);

          let plannedDims = null;
          if (plannedStart) {
            plannedDims = getDimensions(plannedStart, plannedDurationHours);
          }

          let actualDims = null;
          if (actualStart) {
            const durationMs = actualEnd ? (actualEnd.getTime() - actualStart.getTime()) : 0;
            const durationHours = durationMs / 3600000;
            actualDims = getDimensions(actualStart, Math.max(0.2, durationHours));
          }

          if (!plannedDims && !actualDims) return null;

          return (
            <div
              key={`${item._type}-${item.id}`}
              onClick={() => {
                if (onItemClick) {
                  onItemClick(item);
                } else {
                  window.location.assign(
                    adminDispatchOpenUrl(item.workOrderId || item.id),
                  );
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
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500 whitespace-nowrap truncate">#{item.workOrderId || item.id}</span>
                </div>
              )}
              {actualDims && (
                <div
                  className={`absolute top-2.5 bottom-2.5 rounded shadow-sm flex items-center px-2 overflow-hidden cursor-pointer hover:z-20 hover:scale-[1.02] transition ${item.status === 'IN_PROGRESS' ? 'bg-blue-500 dark:bg-blue-600 animate-pulse' : 'bg-emerald-500 dark:bg-emerald-600'}`}
                  style={{ left: actualDims.left, width: actualDims.width }}
                  title={formatItemTooltip(item, {
                    date: actualStart ? formatUiDateOnly(actualStart) : "—",
                    time: `${actualStart ? formatUiTimeHm(actualStart) : "—"} – ${actualEnd ? formatUiTimeHm(actualEnd) : dict.inProgressShort}`,
                    footer: dict.clickToDetails,
                  })}
                >
                  <span className="text-[10px] font-bold text-white whitespace-nowrap truncate">#{item.workOrderId || item.id}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
