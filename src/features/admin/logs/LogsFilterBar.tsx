"use client";

import { RefreshCcw, Download } from "lucide-react";
import type { WerkitLogCategory } from "@/types/deviceTelemetry";
import { LOG_CATEGORIES, type LogsDict } from "./logsView";

interface LogsFilterBarProps {
  workers: { id: number; fullName: string }[];
  logsDict: LogsDict;
  filterUserId: number | "ALL";
  filterLevel: string;
  filterCategory: WerkitLogCategory | "ALL";
  exporting: boolean;
  exportHint: string;
  onFilterUserIdChange: (value: number | "ALL") => void;
  onFilterLevelChange: (value: string) => void;
  onFilterCategoryChange: (value: WerkitLogCategory | "ALL") => void;
  onExport: () => void;
  onRefresh: () => void;
}

export function LogsFilterBar({
  workers,
  logsDict,
  filterUserId,
  filterLevel,
  filterCategory,
  exporting,
  exportHint,
  onFilterUserIdChange,
  onFilterLevelChange,
  onFilterCategoryChange,
  onExport,
  onRefresh,
}: LogsFilterBarProps) {
  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterUserId}
          onChange={(e) =>
            onFilterUserIdChange(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
          }
          className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="ALL">{logsDict.filterAllWorkers}</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.fullName}
            </option>
          ))}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => onFilterLevelChange(e.target.value)}
          className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="ALL">{logsDict.filterAllLevels}</option>
          <option value="INFO">{logsDict.logLevelLabels.INFO}</option>
          <option value="WARN">{logsDict.logLevelLabels.WARN}</option>
          <option value="ERROR">{logsDict.logLevelLabels.ERROR}</option>
          <option value="DEBUG">{logsDict.logLevelLabels.DEBUG}</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) =>
            onFilterCategoryChange(
              e.target.value === "ALL" ? "ALL" : (e.target.value as WerkitLogCategory)
            )
          }
          className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500 max-w-[11rem]"
        >
          <option value="ALL">{logsDict.filterAllCategories}</option>
          {LOG_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {logsDict.logCategoryLabels[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          title={exportHint}
          disabled={exporting}
          onClick={onExport}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-60 disabled:pointer-events-none text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {exporting ? logsDict.exportJsonLoading : logsDict.exportJson}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCcw className="w-4 h-4 shrink-0" /> {logsDict.refresh}
        </button>
      </div>
    </div>
  );
}
