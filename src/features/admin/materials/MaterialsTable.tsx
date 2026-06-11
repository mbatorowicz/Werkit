"use client";

import { useMemo, useState } from "react";
import { HardHat, Plus } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import {
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TH,
  TABLE_TH_RIGHT,
} from "@/lib/uiTable";
import type { AppDictionary } from "@/i18n/types";
import type { MaterialCategory, MaterialRow } from "./types";
import { MaterialsTableRow } from "./MaterialsTableRow";
import { MaterialPreviewModal } from "./MaterialPreviewModal";

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
            filteredMaterials.map((material) => (
              <MaterialsTableRow
                key={material.id}
                material={material}
                categories={categories}
                machDict={machDict}
                canMutate={canMutate}
                onPreview={setPreviewMaterial}
                onEditMaterial={onEditMaterial}
                onDeleteMaterial={onDeleteMaterial}
                onAdjustStock={onAdjustStock}
                isLowStock={isLowStock}
              />
            ))
          )}
        </tbody>
      </AdminTableShell>

      <MaterialPreviewModal
        material={previewMaterial}
        categories={categories}
        dict={dict}
        machDict={machDict}
        canMutate={canMutate}
        onClose={() => setPreviewMaterial(null)}
        onEditMaterial={onEditMaterial}
      />
    </>
  );
}
