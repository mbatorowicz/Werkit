"use client";

import { useState } from "react";
import { getDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { CategoryTreePanel } from "@/components/Admin/CategoryTreePanel";
import { MaterialsCategoryFormModal } from "@/features/admin/materials/MaterialsCategoryFormModal";
import { materialCategoryToForm } from "@/features/admin/materials/materialCategoryForm";
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
  const groups = getDictionary().admin.groups;
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
      <CategoryTreePanel
        title={dict.dictTitle}
        subtitle={dict.dictSubtitle}
        addLabel={dict.addCategory}
        emptyLabel={dict.noCategories}
        groupBadge={groups.badgeGroup}
        items={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        onAdd={openNewCategory}
        onEdit={(cat) => {
          setCatEditId(cat.id);
          setCatForm(materialCategoryToForm(cat));
          setIsCatModalOpen(true);
        }}
        onDelete={handleCatDelete}
      />

      <MaterialsCategoryFormModal
        open={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        isEdit={catEditId != null}
        dict={dict}
        machDict={machDict}
        categories={categories}
        excludeId={catEditId}
        form={catForm}
        setForm={setCatForm}
        onSubmit={handleCatSave}
      />
    </>
  );
}
