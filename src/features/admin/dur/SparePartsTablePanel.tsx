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
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import {
  TABLE_ACTION_ICON_DELETE,
  TABLE_ACTION_ICON_EDIT,
  TABLE_ACTION_LINK,
  TABLE_ACTIONS,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_BODY_ROW,
  TABLE_HEAD_ROW,
  TABLE_LOW_STOCK_BADGE,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TD_RIGHT,
  TABLE_TD_STRONG,
  TABLE_TH,
  TABLE_TH_RIGHT,
} from "@/lib/uiTable";

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

      <AdminTableShell minWidthClass="min-w-[720px]">
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_TH}>{dict.table.name}</th>
            <th className={TABLE_TH}>{dict.table.catalogNumber}</th>
            <th className={TABLE_TH}>{dict.table.manufacturer}</th>
            <th className={TABLE_TH}>{dict.table.unit}</th>
            <th className={TABLE_TH_RIGHT}>{dict.table.stock}</th>
            <th className={TABLE_TH_RIGHT}>{dict.table.minStock}</th>
            <th className={TABLE_TH}>{dict.table.location}</th>
            {canMutate ? <th className={TABLE_TH_RIGHT}>{dict.table.actions}</th> : null}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={canMutate ? 8 : 7} className={TABLE_EMPTY_CELL}>
                {dict.fetching}
              </td>
            </tr>
          ) : filteredParts.length === 0 ? (
            <tr>
              <td colSpan={canMutate ? 8 : 7} className={TABLE_EMPTY_CELL}>
                {searchQuery.trim() ? dict.emptySearch : dict.empty}
              </td>
            </tr>
          ) : (
            filteredParts.map((part) => {
              const stock = parseDecimalInput(part.stockQuantity ?? "0") ?? 0;
              const minStock = parseDecimalInput(part.minStock ?? "0") ?? 0;
              const isLowStock = minStock > 0 && stock < minStock;
              return (
                <tr key={part.id} className={TABLE_BODY_ROW}>
                  <td className={TABLE_TD_STRONG}>
                    <div className="flex items-center gap-2">
                      {part.name}
                      {isLowStock ? (
                        <span
                          className={TABLE_LOW_STOCK_BADGE}
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
                  <td className={`${TABLE_TD_MUTED} font-mono text-xs`}>
                    {part.catalogNumber ?? "—"}
                  </td>
                  <td className={TABLE_TD_MUTED}>{part.manufacturer ?? "—"}</td>
                  <td className={TABLE_TD_MUTED}>{part.unit}</td>
                  <td
                    className={cn(
                      TABLE_TD_RIGHT,
                      "font-mono tabular-nums",
                      isLowStock && "font-semibold text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {part.stockQuantity ?? "0"}
                  </td>
                  <td className={`${TABLE_TD_RIGHT} font-mono tabular-nums`}>
                    {minStock > 0 ? part.minStock : "—"}
                  </td>
                  <td className={`${TABLE_TD_MUTED} text-xs`}>{part.location ?? "—"}</td>
                  {canMutate ? (
                    <td className={TABLE_TD_RIGHT}>
                      <div className={TABLE_ACTIONS}>
                        {onAdjustStock ? (
                          <button
                            type="button"
                            onClick={() => onAdjustStock(part)}
                            className={TABLE_ACTION_LINK}
                            title={wh.adjustStock}
                          >
                            {wh.adjustStock}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onEditPart(part)}
                          className={TABLE_ACTION_ICON_EDIT}
                          title={dict.editPart}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePart(part)}
                          className={TABLE_ACTION_ICON_DELETE}
                          title={dict.deletePart}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </AdminTableShell>
    </>
  );
}
