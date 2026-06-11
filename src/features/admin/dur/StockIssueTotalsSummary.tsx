"use client";

import { formatDict, useDictionary } from "@/i18n";
import { decimalStringForStorage } from "@/lib/decimalInput";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";

export interface StockIssueTotalItem {
  partName: string;
  quantity: number;
  unit: string;
}

interface StockIssueTotalsSummaryProps {
  items: StockIssueTotalItem[];
}

export function StockIssueTotalsSummary({ items }: StockIssueTotalsSummaryProps) {
  const wh = warehouseCommonLabels(useDictionary());

  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <p className="mb-2 font-medium text-emerald-900 dark:text-emerald-200">
        {wh.movementsFilterSummary}
      </p>
      <ul className="space-y-1 text-emerald-800 dark:text-emerald-300">
        {items.map((item) => (
          <li key={item.partName}>
            {formatDict(wh.movementsFilterSummaryLine, {
              item: item.partName,
              qty: decimalStringForStorage(String(item.quantity)) ?? String(item.quantity),
              unit: item.unit,
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
