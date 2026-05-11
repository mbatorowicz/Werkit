"use client";

import { Search } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";

type OrdersDict = AppDictionary["admin"]["orders"];
export type DispatchViewMode = "board" | "table";

export function OrdersDispatchToolbar({
  dict,
  searchQuery,
  onSearchChange,
  tableLimit,
  onTableLimitChange,
  viewMode,
  onViewModeChange,
}: {
  dict: OrdersDict;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tableLimit: number;
  onTableLimitChange: (n: number) => void;
  viewMode: DispatchViewMode;
  onViewModeChange: (m: DispatchViewMode) => void;
}) {
  const sizes = [10, 20, 50, 100] as const;

  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center gap-4 bg-zinc-50 dark:bg-[#0a0a0b]">
      <div className="relative flex-1 max-w-sm min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={dict.tableSearchPlaceholder}
          className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition outline-none"
        />
      </div>
      <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => onViewModeChange("board")}
          className={`px-3 py-2 text-sm font-semibold transition ${
            viewMode === "board"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          Board
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("table")}
          className={`px-3 py-2 text-sm font-semibold transition border-l border-zinc-200 dark:border-zinc-700 ${
            viewMode === "table"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          Tabela
        </button>
      </div>
      <select
        value={tableLimit}
        onChange={(e) => onTableLimitChange(Number(e.target.value))}
        className="bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
      >
        {sizes.map((n) => (
          <option key={n} value={n}>{`${n} ${dict.tableResultsSuffix}`}</option>
        ))}
      </select>
    </div>
  );
}
