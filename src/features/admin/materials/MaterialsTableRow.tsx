"use client";

import { Edit2, Trash2 } from "lucide-react";
import { CategoryColorBadge } from "@/components/CategoryColorBadge";
import { formatDict, useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import {
  TABLE_ACTION_ICON_DELETE,
  TABLE_ACTION_ICON_EDIT,
  TABLE_ACTION_LINK,
  TABLE_ACTIONS,
  TABLE_CELL_NAME,
  TABLE_CELL_SUBTITLE,
  TABLE_ROW_CLICKABLE,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TD_RIGHT,
} from "@/lib/uiTable";
import type { AppDictionary } from "@/i18n/types";
import type { MaterialCategory, MaterialRow } from "./types";

interface MaterialsTableRowProps {
  material: MaterialRow;
  categories: MaterialCategory[];
  machDict: AppDictionary["admin"]["machines"];
  canMutate: boolean;
  onPreview: (material: MaterialRow | null) => void;
  onEditMaterial: (material: MaterialRow) => void;
  onDeleteMaterial: (id: number) => void;
  onAdjustStock?: (material: MaterialRow) => void;
  isLowStock?: (material: MaterialRow) => boolean;
}

export function MaterialsTableRow({
  material,
  categories,
  machDict,
  canMutate,
  onPreview,
  onEditMaterial,
  onDeleteMaterial,
  onAdjustStock,
  isLowStock,
}: MaterialsTableRowProps) {
  const wh = warehouseCommonLabels(useDictionary());
  const mCats = categories.filter((c) => material.categoryIds?.includes(c.id));

  return (
    <tr onClick={() => onPreview(material)} className={TABLE_ROW_CLICKABLE}>
      <td className={TABLE_TD}>
        <div className={TABLE_CELL_NAME}>{material.name}</div>
        <div className={TABLE_CELL_SUBTITLE}>ID #{material.id}</div>
      </td>
      <td className={TABLE_TD}>
        <div className="flex flex-wrap gap-1">
          {mCats.length > 0 ? (
            mCats.map((c) => <CategoryColorBadge key={c.id} label={c.name} color={c.color} />)
          ) : (
            <span className="text-xs italic text-zinc-500">{machDict.noCategoryBadge}</span>
          )}
        </div>
      </td>
      <td className={TABLE_TD_MUTED}>{material.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT}</td>
      <td className={TABLE_TD}>
        <div className="flex flex-col gap-1">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {formatDict(wh.stockWithUnit, {
              qty: material.stockQuantity ?? "0",
              unit: material.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
            })}
          </span>
          {isLowStock?.(material) ? (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {wh.lowStock}
            </span>
          ) : null}
        </div>
      </td>
      {canMutate ? (
        <td className={TABLE_TD_RIGHT}>
          <div className={TABLE_ACTIONS}>
            {onAdjustStock ? (
              <button
                type="button"
                onClick={(e) => {
                  stopRowActionClick(e);
                  onAdjustStock(material);
                }}
                className={TABLE_ACTION_LINK}
                title={wh.adjustStock}
              >
                {wh.adjustStock}
              </button>
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                stopRowActionClick(e);
                onPreview(null);
                onEditMaterial(material);
              }}
              className={TABLE_ACTION_ICON_EDIT}
              title={machDict.editTitle}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                stopRowActionClick(e);
                void onDeleteMaterial(material.id);
              }}
              className={TABLE_ACTION_ICON_DELETE}
              title={machDict.deleteTitle}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}
