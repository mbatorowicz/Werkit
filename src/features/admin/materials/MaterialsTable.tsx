"use client";

import { useMemo, useState } from "react";
import { Edit2, HardHat, Plus, Trash2 } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { CategoryColorBadge } from "@/components/CategoryColorBadge";
import { formatDict, useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import {
  TABLE_ACTION_ICON_DELETE,
  TABLE_ACTION_ICON_EDIT,
  TABLE_ACTION_LINK,
  TABLE_ACTIONS,
  TABLE_CELL_NAME,
  TABLE_CELL_SUBTITLE,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_ROW_CLICKABLE,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TD_RIGHT,
  TABLE_TH,
  TABLE_TH_RIGHT,
} from "@/lib/uiTable";
import type { AppDictionary } from "@/i18n/types";
import type { MaterialCategory, MaterialRow } from "./types";

type Dict = AppDictionary["admin"]["materials"];
type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  machDict: MachDict;
  materials: MaterialRow[];
  categories: MaterialCategory[];
  isLoading: boolean;
  canMutate: boolean;
  onAddMaterial: () => void;
  onEditMaterial: (material: MaterialRow) => void;
  onDeleteMaterial: (id: number) => void;
  onAdjustStock?: (material: MaterialRow) => void;
  isLowStock?: (material: MaterialRow) => boolean;
};

export function MaterialsTable({
  dict,
  machDict,
  materials,
  categories,
  isLoading,
  canMutate,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onAdjustStock,
  isLowStock,
}: Props) {
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const sharedDict = dictionary.admin.shared;
  const ui = dictionary.admin.ui;
  const [previewMaterial, setPreviewMaterial] = useState<MaterialRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return materials;
    return materials.filter((material) => {
      if (matchesSearchQuery(material.name, q)) return true;
      const mCats = categories.filter((c) => material.categoryIds?.includes(c.id));
      return mCats.some((c) => matchesSearchQuery(c.name, q));
    });
  }, [materials, categories, searchQuery]);

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-10 dark:border-zinc-800/80 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <HardHat className="h-6 w-6 text-emerald-500" />
            {dict.sectionItemsTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dict.fleetSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={onAddMaterial}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {dict.addMaterial}
          </button>
        ) : null}
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={dict.listSearchPlaceholder}
      />

      <AdminTableShell minWidthClass="min-w-[480px]">
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_TH}>{dict.materialReg}</th>
            <th className={TABLE_TH}>{machDict.dictCategory}</th>
            <th className={TABLE_TH}>{dict.unitColumn}</th>
            <th className={TABLE_TH}>{wh.stockColumn}</th>
            {canMutate ? <th className={TABLE_TH_RIGHT}>{machDict.management}</th> : null}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={canMutate ? 5 : 4} className={TABLE_EMPTY_CELL}>
                {dict.fetching}
              </td>
            </tr>
          ) : filteredMaterials.length === 0 ? (
            <tr>
              <td colSpan={canMutate ? 5 : 4} className={TABLE_EMPTY_CELL}>
                {searchQuery.trim() ? dict.listSearchNoResults : dict.noMaterials}
              </td>
            </tr>
          ) : (
            filteredMaterials.map((material) => {
              const mCats = categories.filter((c) => material.categoryIds?.includes(c.id));
              return (
                <tr
                  key={material.id}
                  onClick={() => setPreviewMaterial(material)}
                  className={TABLE_ROW_CLICKABLE}
                >
                  <td className={TABLE_TD}>
                    <div className={TABLE_CELL_NAME}>{material.name}</div>
                    <div className={TABLE_CELL_SUBTITLE}>ID #{material.id}</div>
                  </td>
                  <td className={TABLE_TD}>
                    <div className="flex flex-wrap gap-1">
                      {mCats.length > 0 ? (
                        mCats.map((c) => (
                          <CategoryColorBadge key={c.id} label={c.name} color={c.color} />
                        ))
                      ) : (
                        <span className="text-xs italic text-zinc-500">{machDict.noCategoryBadge}</span>
                      )}
                    </div>
                  </td>
                  <td className={TABLE_TD_MUTED}>
                    {material.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT}
                  </td>
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
                            setPreviewMaterial(null);
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
            })
          )}
        </tbody>
      </AdminTableShell>

      <AdminPreviewModal
        open={previewMaterial != null}
        onClose={() => setPreviewMaterial(null)}
        title={ui.previewTitle}
        canEdit={canMutate}
        onEdit={
          previewMaterial
            ? () => {
                setPreviewMaterial(null);
                onEditMaterial(previewMaterial);
              }
            : undefined
        }
        editLabel={machDict.editTitle}
      >
        {previewMaterial ? (
          <>
            <AdminPreviewField label={dict.nameLabel} value={previewMaterial.name} />
            <AdminPreviewField label="ID" value={`#${previewMaterial.id}`} />
            <AdminPreviewField label={dict.matCatLabel}>
              <div className="flex flex-wrap gap-1">
                {categories
                  .filter((c) => (previewMaterial.categoryIds ?? []).includes(c.id))
                  .map((c) => (
                    <CategoryColorBadge key={c.id} label={c.name} color={c.color} />
                  ))}
                {(previewMaterial.categoryIds?.length ?? 0) === 0 ? (
                  <span className="italic text-zinc-500">{machDict.noCategoryBadge}</span>
                ) : null}
              </div>
            </AdminPreviewField>
            <AdminPreviewField
              label={sharedDict.measureUnitLabel}
              value={previewMaterial.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT}
            />
            <AdminPreviewField
              label={wh.stockColumn}
              value={formatDict(wh.stockWithUnit, {
                qty: previewMaterial.stockQuantity ?? "0",
                unit: previewMaterial.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
              })}
            />
            {previewMaterial.minStock ? (
              <AdminPreviewField label={dict.minStockLabel} value={previewMaterial.minStock} />
            ) : null}
            {previewMaterial.location ? (
              <AdminPreviewField label={dict.locationLabel} value={previewMaterial.location} />
            ) : null}
          </>
        ) : null}
      </AdminPreviewModal>
    </>
  );
}
