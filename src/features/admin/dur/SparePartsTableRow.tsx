"use client";

import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { formatDict, useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { SparePart } from "@/types/dur";
import { parseDecimalInput } from "@/lib/decimalInput";
import { cn } from "@/lib/cn";
import {
  TABLE_ACTION_ICON_DELETE,
  TABLE_ACTION_ICON_EDIT,
  TABLE_ACTION_LINK,
  TABLE_ACTIONS,
  TABLE_BODY_ROW,
  TABLE_LOW_STOCK_BADGE,
  TABLE_TD_MUTED,
  TABLE_TD_RIGHT,
  TABLE_TD_STRONG,
} from "@/lib/uiTable";

interface SparePartsTableRowProps {
  part: SparePart;
  dict: AppDictionary["dur"]["spareParts"];
  canMutate: boolean;
  onEditPart: (part: SparePart) => void;
  onDeletePart: (part: SparePart) => void;
  onAdjustStock?: (part: SparePart) => void;
}

export function SparePartsTableRow({
  part,
  dict,
  canMutate,
  onEditPart,
  onDeletePart,
  onAdjustStock,
}: SparePartsTableRowProps) {
  const wh = warehouseCommonLabels(useDictionary());
  const stock = parseDecimalInput(part.stockQuantity ?? "0") ?? 0;
  const minStock = parseDecimalInput(part.minStock ?? "0") ?? 0;
  const isLowStock = minStock > 0 && stock < minStock;

  return (
    <tr className={TABLE_BODY_ROW}>
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
      <td className={`${TABLE_TD_MUTED} font-mono text-xs`}>{part.catalogNumber ?? "—"}</td>
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
}
