"use client";

import { parseDecimalInput } from "@/lib/decimalInput";
import type { StockReceipt } from "@/types/dur";

interface StockReceiptsTableProps {
  receipts: (StockReceipt & {
    partName?: string;
    partCatalogNumber?: string;
    creatorName?: string;
  })[];
  dict: {
    table: {
      date: string;
      part: string;
      catalogNumber: string;
      quantity: string;
      unitPrice: string;
      totalValue: string;
      invoiceNumber: string;
      createdBy: string;
      notes: string;
    };
  };
}

export function StockReceiptsTable({ receipts, dict }: StockReceiptsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.date}
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.part}
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.catalogNumber}
            </th>
            <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.quantity}
            </th>
            <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.unitPrice}
            </th>
            <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.totalValue}
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.invoiceNumber}
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.createdBy}
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.notes}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {receipts.map((r) => (
            <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <td className="px-4 py-3 text-zinc-500 text-xs">
                {new Date(r.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                {r.partName || `#${r.partId}`}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {r.partCatalogNumber || "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-white">
                {r.quantity}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                {r.unitPrice || "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-white">
                {r.unitPrice && r.quantity
                  ? (
                      (parseDecimalInput(r.unitPrice) ?? 0) * (parseDecimalInput(r.quantity) ?? 0)
                    ).toFixed(2)
                  : "—"}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {r.invoiceNumber || "—"}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.creatorName || "—"}</td>
              <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">
                {r.notes || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
