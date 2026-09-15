"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import type { AppDictionary } from "@/i18n/types";
import { cn } from "@/lib/cn";
import { TAB_ACTIVE, TAB_IDLE } from "@/lib/uiChrome";
import { SELECT_BASE } from "@/lib/uiTokens";

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
  hideTableMode = false,
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
  hideTableMode?: boolean;
}) {
  const sizes = [10, 20, 50, 100] as const;
  const showTableControls = !hideTableMode;

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/80">
      <div className="min-w-[200px] flex-1 max-w-sm">
        <ListSearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={dict.tableSearchPlaceholder}
          className="mb-0"
        />
      </div>
      {showTableControls ? (
        <div className="flex items-center overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => onViewModeChange("board")}
            className={viewMode === "board" ? TAB_ACTIVE : TAB_IDLE}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={cn(
              viewMode === "table" ? TAB_ACTIVE : TAB_IDLE,
              "border-l border-zinc-200 dark:border-zinc-700"
            )}
          >
            Tabela
          </button>
        </div>
      ) : null}
      {showTableControls && viewMode === "table" && totalPages > 1 ? (
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
      {showTableControls ? (
        <select
          value={tableLimit}
          onChange={(e) => onTableLimitChange(Number(e.target.value))}
          className={cn(SELECT_BASE, "w-auto")}
        >
          {sizes.map((n) => (
            <option key={n} value={n}>{`${n} ${dict.tableResultsSuffix}`}</option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
