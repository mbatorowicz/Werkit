"use client";

import { useState } from "react";
import { Edit2, Layers, Plus, Trash2 } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { MaterialsCategoryFormModal } from "@/features/admin/materials/MaterialsCategoryFormModal";
import {
  EMPTY_CATEGORY_FORM,
  type MaterialCategory,
  type MaterialCategoryFormState,
} from "@/features/admin/materials/types";

type Dict = AppDictionary["admin"]["materials"];
type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  machDict: MachDict;
  apiErrors: Record<string, string>;
  categories: MaterialCategory[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function MaterialsClientCategoriesPanel({
  dict,
  machDict,
  apiErrors,
  categories,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState<MaterialCategoryFormState>(() => ({ ...EMPTY_CATEGORY_FORM }));

  const handleCatSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = catEditId ? `/api/material-categories/${catEditId}` : "/api/material-categories";
    const method = catEditId ? "PUT" : "POST";
    try {
      const res = await fetchWithDeviceTelemetry(
        catEditId ? `Admin materials: save category PUT ${catEditId}` : "Admin materials: save category POST",
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(catForm),
        },
        { category: "admin" },
      );
      if (res.ok) {
        setIsCatModalOpen(false);
        void fetchData();
      } else {
        const err = (await res.json()) as { error?: string };
        await appAlert({ message: appDialogApiMessage(apiErrors, err.error, machDict.apiError) });
      }
    } catch {
      await appAlert({ message: machDict.apiError });
    }
  };

  const handleCatDelete = async (id: number) => {
    if (!(await appConfirm({ message: dict.confirmCatDelete, variant: "danger" }))) return;
    const res = await fetchWithDeviceTelemetry(
      `Admin materials: delete category ${id}`,
      `/api/material-categories/${id}`,
      { method: "DELETE" },
      { category: "admin" },
    );
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()) as { error?: string };
      await appAlert({ message: appDialogApiMessage(apiErrors, err.error, machDict.apiError) });
    }
  };

  const openNewCategory = () => {
    setCatEditId(null);
    setCatForm({ ...EMPTY_CATEGORY_FORM });
    setIsCatModalOpen(true);
  };

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 pt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Layers className="h-5 w-5 text-amber-500" /> {dict.dictTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{dict.dictSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={openNewCategory}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" /> {dict.addCategory}
          </button>
        ) : null}
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-700 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="h-5 w-5 shrink-0 rounded-md shadow-sm"
                style={{ backgroundColor: cat.color || "#3f3f46" }}
              />
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">{cat.name}</span>
            </div>
            {canMutate ? (
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setCatEditId(cat.id);
                    setCatForm({ name: cat.name, color: cat.color || "#3f3f46" });
                    setIsCatModalOpen(true);
                  }}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-amber-500 dark:text-zinc-400"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleCatDelete(cat.id)}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-red-500 dark:text-zinc-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {!isLoading && categories.length === 0 ? (
          <div className="col-span-full rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:text-zinc-400">
            {dict.noCategories}
          </div>
        ) : null}
      </div>

      <MaterialsCategoryFormModal
        open={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        isEdit={catEditId != null}
        dict={dict}
        machDict={machDict}
        form={catForm}
        setForm={setCatForm}
        onSubmit={handleCatSave}
      />
    </>
  );
}
