"use client";

import type { StockIssue } from "@/types/dur";

interface StockIssuesTableProps {
  issues: (StockIssue & {
    partName?: string;
    partCatalogNumber?: string;
    creatorName?: string;
    workOrderLabel?: string;
    issuedToName?: string;
    resourceName?: string;
  })[];
  dict: {
    table: {
      date: string;
      part: string;
      catalogNumber: string;
      quantity: string;
      workOrder: string;
      issuedTo: string;
      resource: string;
      createdBy: string;
      notes: string;
    };
  };
}

export function StockIssuesTable({ issues, dict }: StockIssuesTableProps) {
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
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.workOrder}
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.issuedTo}
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              {dict.table.resource}
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
          {issues.map((iss) => (
            <tr
              key={iss.id}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <td className="px-4 py-3 text-zinc-500 text-xs">
                {new Date(iss.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                {iss.partName || `#${iss.partId}`}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {iss.partCatalogNumber || "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-white">
                {iss.quantity}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {iss.workOrderLabel || (iss.workOrderId ? `#${iss.workOrderId}` : "—")}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {iss.issuedToName ?? (iss.issuedTo ? `#${iss.issuedTo}` : "—")}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {iss.resourceName ?? "—"}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {iss.creatorName || "—"}
              </td>
              <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">
                {iss.notes || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
