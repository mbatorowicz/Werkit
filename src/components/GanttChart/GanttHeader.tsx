"use client";

import { ChevronLeft, ChevronRight, User, Truck } from "lucide-react";

type Props = {
  groupBy: 'WORKER' | 'MACHINE';
  setGroupBy: (v: 'WORKER' | 'MACHINE') => void;
  startHour: number;
  endHour: number;
  setStartHour: (v: number) => void;
  setEndHour: (v: number) => void;
  selectedDateStr: string;
  setSelectedDateStr: (v: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  dict: Record<string, string>;
};

export function GanttHeader({
  groupBy,
  setGroupBy,
  startHour,
  endHour,
  setStartHour,
  setEndHour,
  selectedDateStr,
  setSelectedDateStr,
  onPrevDay,
  onNextDay,
  dict,
}: Props) {
  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center bg-white dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setGroupBy('WORKER')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${groupBy === 'WORKER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
        >
          <User className="w-4 h-4" /> {dict.groupByWorker}
        </button>
        <button
          onClick={() => setGroupBy('MACHINE')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${groupBy === 'MACHINE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
        >
          <Truck className="w-4 h-4" /> {dict.groupByResource}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-500">Od:</label>
          <input
            type="number"
            min="0"
            max={endHour - 1}
            value={startHour}
            onChange={e => setStartHour(Math.min(endHour - 1, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-16 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
          />
          <label className="text-xs font-medium text-zinc-500">Do:</label>
          <input
            type="number"
            min={startHour + 1}
            max="24"
            value={endHour}
            onChange={e => setEndHour(Math.max(startHour + 1, Math.min(24, parseInt(e.target.value) || 24)))}
            className="w-16 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPrevDay} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDateStr}
            onChange={e => setSelectedDateStr(e.target.value)}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button onClick={onNextDay} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
