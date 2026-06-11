"use client";

import { Trash2 } from "lucide-react";
import { parseDecimalInput } from "@/lib/decimalInput";
import type { AppDictionary } from "@/i18n/types";
import type { WorkOrderSparePartRow } from "./useWorkOrderSpareParts";

interface WorkOrderSparePartsTableProps {
  parts: WorkOrderSparePartRow[];
  durDict: AppDictionary["dur"]["workOrderSpareParts"];
  onRemovePart: (partId: number) => void;
}

export function WorkOrderSparePartsTable({
  parts,
  durDict,
  onRemovePart,
}: WorkOrderSparePartsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-800/50">
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
              {durDict.table.name}
            </th>
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
              {durDict.table.catalogNumber}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
              {durDict.table.quantity}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
              {durDict.table.unitPrice}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
              {durDict.table.totalPrice}
            </th>
            <th className="px-3 py-2 text-center font-semibold text-zinc-500 dark:text-zinc-400">
              {durDict.table.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {parts.map((p) => {
            const qty = parseDecimalInput(p.quantity) ?? 0;
            const price = parseDecimalInput(p.unitPrice ?? "") ?? 0;
            const total = qty * price;
            return (
              <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">
                  {p.partName}
                </td>
                <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{p.partSku}</td>
                <td className="px-3 py-2 text-right text-zinc-900 dark:text-white">{p.quantity}</td>
                <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                  {p.unitPrice ? `${p.unitPrice} zł` : "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-white">
                  {total > 0 ? `${total.toFixed(2)} zł` : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onRemovePart(p.id)}
                    className="text-red-500 hover:text-red-400 transition"
                    title={durDict.returnPart ?? durDict.removePart}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Podsumowanie */}
      {parts.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">
            {durDict.totals.partsCount.replace("{count}", String(parts.length))}
          </span>
          {(() => {
            const totalValue = parts.reduce((sum, p) => {
              const qty = parseDecimalInput(p.quantity) ?? 0;
              const price = parseDecimalInput(p.unitPrice ?? "") ?? 0;
              return sum + qty * price;
            }, 0);
            return totalValue > 0 ? (
              <span className="font-semibold text-zinc-900 dark:text-white">
                {durDict.totals.totalValue.replace("{value}", `${totalValue.toFixed(2)} zł`)}
              </span>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
