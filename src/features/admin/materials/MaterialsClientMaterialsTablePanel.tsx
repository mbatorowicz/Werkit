"use client";

import { useState } from "react";
import { Edit2, Layers, Plus, Trash2 } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { MaterialsMaterialFormModal } from "@/features/admin/materials/MaterialsMaterialFormModal";
import {
  EMPTY_MATERIAL_FORM,
  type MaterialCategory,
  type MaterialItemFormState,
  type MaterialRow,
} from "@/features/admin/materials/types";

type Dict = AppDictionary["admin"]["materials"];
type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  machDict: MachDict;
  apiErrors: Record<string, string>;
  materials: MaterialRow[];
  categories: MaterialCategory[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function MaterialsClientMaterialsTablePanel({
  dict,
  machDict,
  apiErrors,
  materials,
  categories,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matEditId, setMatEditId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MaterialItemFormState>(() => ({ ...EMPTY_MATERIAL_FORM }));

  const handleMatSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matForm.categoryIds.length === 0) {
      alert(dict.matCatRequired);
      return;
    }
    const url = matEditId ? `/api/materials/${matEditId}` : "/api/materials";
    const method = matEditId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: matForm.name,
          categoryIds: matForm.categoryIds,
        }),
      });
      if (res.ok) {
        setIsMatModalOpen(false);
        void fetchData();
      } else {
        const err = (await res.json()) as { error?: string };
        alert(apiErrors[err.error ?? ""] ?? err.error);
      }
    } catch {
      alert(machDict.apiError);
    }
  };

  const handleMatDelete = async (id: number) => {
    if (!confirm(dict.confirmDelete)) return;
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()) as { error?: string };
      alert(apiErrors[err.error ?? ""] ?? err.error);
    }
  };

  const openNewMaterial = () => {
    setMatEditId(null);
    setMatForm({ ...EMPTY_MATERIAL_FORM });
    setIsMatModalOpen(true);
  };

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-t border-zinc-800/80 pt-10 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Layers className="h-6 w-6 text-emerald-500" /> {dict.sectionItemsTitle}
          </h2>
          <p className="mt-1 text-zinc-500">{dict.fleetSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={openNewMaterial}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            {dict.registerMaterial}
          </button>
        ) : null}
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700/50 dark:bg-[#0a0a0b]/80">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {dict.materialReg}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {machDict.dictCategory}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {machDict.management}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {dict.fetching}
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  const mCats = categories.filter((c) => material.categoryIds?.includes(c.id));
                  return (
                    <tr key={material.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-200">{material.name}</div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                          {machDict.idReg} #{material.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {mCats.length > 0 ? (
                            mCats.map((c) => (
                              <span
                                key={c.id}
                                className="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${c.color || "#71717a"}1a`,
                                  color: c.color || "#71717a",
                                  borderColor: `${c.color || "#71717a"}33`,
                                }}
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs italic text-zinc-500">{machDict.noCategoryBadge}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canMutate ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setMatEditId(material.id);
                                setMatForm({
                                  name: material.name,
                                  categoryIds: material.categoryIds || [],
                                });
                                setIsMatModalOpen(true);
                              }}
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-amber-500/10 hover:text-amber-500 dark:text-zinc-400"
                              title={machDict.editTitle}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleMatDelete(material.id)}
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-400"
                              title={machDict.deleteTitle}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
              {!isLoading && materials.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {dict.noMaterials}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <MaterialsMaterialFormModal
        open={isMatModalOpen}
        onClose={() => setIsMatModalOpen(false)}
        isEdit={matEditId != null}
        dict={dict}
        machDict={machDict}
        categories={categories}
        form={matForm}
        setForm={setMatForm}
        onSubmit={handleMatSave}
      />
    </>
  );
}
