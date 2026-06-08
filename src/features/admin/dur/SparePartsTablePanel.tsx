"use client";

import { useMemo, useState } from "react";
import { Cog, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import type { AppDictionary } from "@/i18n/types";
import { formatDict, useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { SparePart } from "@/types/dur";
import { parseDecimalInput } from "@/lib/decimalInput";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";

type Dict = AppDictionary["dur"]["spareParts"];

type Props = {
  dict: Dict;
  parts: SparePart[];
  isLoading: boolean;
  canMutate: boolean;
  onAddPart: () => void;
  onEditPart: (part: SparePart) => void;
  onDeletePart: (part: SparePart) => void;
  onAdjustStock?: (part: SparePart) => void;
};

export function SparePartsTablePanel({
  dict,
  parts,
  isLoading,
  canMutate,
  onAddPart,
  onEditPart,
  onDeletePart,
  onAdjustStock,
}: Props) {
  const wh = warehouseCommonLabels(useDictionary());
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return parts;
    return parts.filter(
      (p) =>
        matchesSearchQuery(p.name, q) ||
        matchesSearchQuery(p.catalogNumber ?? "", q) ||
        matchesSearchQuery(p.manufacturer ?? "", q)
    );
  }, [parts, searchQuery]);

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-10 dark:border-zinc-800/80 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Cog className="h-6 w-6 text-emerald-500" />
            {dict.sectionCatalogTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dict.sectionCatalogSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={onAddPart}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {dict.newPart}
          </button>
        ) : null}
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={dict.searchPlaceholder}
      />

      {isLoading ? (
        <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">{dict.fetching}</div>
      ) : null}

      {!isLoading && filteredParts.length === 0 ? (
        <div className="py-12 text-center">
          <Cog className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {searchQuery.trim() ? dict.emptySearch : dict.empty}
          </p>
        </div>
      ) : null}

      {!isLoading && filteredParts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.name}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.catalogNumber}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.manufacturer}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.unit}
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.stock}
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.minStock}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.location}
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {filteredParts.map((part) => {
                const stock = parseDecimalInput(part.stockQuantity ?? "0") ?? 0;
                const minStock = parseDecimalInput(part.minStock ?? "0") ?? 0;
                const isLowStock = minStock > 0 && stock < minStock;
                return (
                <tr
                  key={part.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {part.name}
                      {isLowStock ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                          title={formatDict(wh.lowStockTooltip, {
                            minStock: String(part.minStock),
                            unit: part.unit,
                          })}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {wh.lowStockAlert}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {part.catalogNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {part.manufacturer ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{part.unit}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular-nums ${
                      isLowStock
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {part.stockQuantity ?? "0"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                    {minStock > 0 ? part.minStock : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                    {part.location ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canMutate ? (
                      <div className="flex items-center justify-end gap-1">
                        {onAdjustStock ? (
                          <button
                            type="button"
                            onClick={() => onAdjustStock(part)}
                            className="rounded-md px-2 py-1 text-[10px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            title={wh.adjustStock}
                          >
                            {wh.adjustStock}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onEditPart(part)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-500/10"
                          title={dict.editPart}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePart(part)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          title={dict.deletePart}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
