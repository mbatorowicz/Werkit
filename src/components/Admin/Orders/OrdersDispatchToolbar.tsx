"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
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
  page,
  totalPages,
  onPageChange,
}: {
  dict: OrdersDict;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tableLimit: number;
  onTableLimitChange: (n: number) => void;
  viewMode: DispatchViewMode;
  onViewModeChange: (m: DispatchViewMode) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const sizes = [10, 20, 50, 100] as const;

  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center gap-4 bg-zinc-50 dark:bg-[#0a0a0b]">
      <div className="flex-1 max-w-sm min-w-[200px]">
        <ListSearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={dict.tableSearchPlaceholder}
          className="mb-0"
        />
      </div>
      <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => onViewModeChange("board")}
          className={`px-3 py-2 text-sm font-semibold transition ${
            viewMode === "board"
              ? "bg-emerald-600 text-white dark:bg-emerald-500"
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
              ? "bg-emerald-600 text-white dark:bg-emerald-500"
              : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          Tabela
        </button>
      </div>
      {viewMode === "table" && totalPages > 1 ? (
        <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2.5 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition"
            title={dict.previousPage}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 border-x border-zinc-200 dark:border-zinc-700">
            {page}/{totalPages}
          </div>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-2.5 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition"
            title={dict.nextPage}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : null}
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
