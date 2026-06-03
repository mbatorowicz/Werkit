"use client";

import { useMemo, useState } from "react";
import { Edit2, HardHat, Plus, Trash2 } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { CategoryColorBadge } from "@/components/CategoryColorBadge";
import { getDictionary } from "@/i18n";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
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
}: Props) {
  const ui = getDictionary().admin.ui;
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
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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

      <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className={INLINE_SCROLL_X_PANEL_CLASS}>
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700/50 dark:bg-[#0a0a0b]/80">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {dict.materialReg}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {machDict.dictCategory}
                </th>
                {canMutate ? (
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {machDict.management}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={canMutate ? 3 : 2}
                    className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    {dict.fetching}
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td
                    colSpan={canMutate ? 3 : 2}
                    className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
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
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-200">
                          {material.name}
                        </div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                          ID #{material.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {mCats.length > 0 ? (
                            mCats.map((c) => (
                              <CategoryColorBadge key={c.id} label={c.name} color={c.color} />
                            ))
                          ) : (
                            <span className="text-xs italic text-zinc-500">
                              {machDict.noCategoryBadge}
                            </span>
                          )}
                        </div>
                      </td>
                      {canMutate ? (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                stopRowActionClick(e);
                                setPreviewMaterial(null);
                                onEditMaterial(material);
                              }}
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-amber-500/10 hover:text-amber-500 dark:text-zinc-400"
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
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-400"
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
          </table>
        </div>
      </div>

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
          </>
        ) : null}
      </AdminPreviewModal>
    </>
  );
}
