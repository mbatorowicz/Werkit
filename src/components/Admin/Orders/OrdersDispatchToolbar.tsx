"use client";

import { Search } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";

type OrdersDict = AppDictionary["admin"]["orders"];

export function OrdersDispatchToolbar({
  dict,
  searchQuery,
  onSearchChange,
  tableLimit,
  onTableLimitChange,
}: {
  dict: OrdersDict;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tableLimit: number;
  onTableLimitChange: (n: number) => void;
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
