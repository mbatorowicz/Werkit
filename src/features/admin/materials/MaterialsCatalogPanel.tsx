"use client";

import { useState } from "react";
import type { AppDictionary } from "@/i18n/types";
import { ExpandableCatalogTree } from "@/components/Admin/ExpandableCatalogTree";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { getCategoryAdminLabels } from "@/features/admin/categories/labels";
import { useCategoryAdminCrud } from "@/features/admin/categories/useCategoryAdminCrud";
import { MaterialCategoryFormModal } from "@/features/admin/materials/MaterialCategoryFormModal";
import { MaterialsMaterialFormModal } from "@/features/admin/materials/MaterialsMaterialFormModal";
import { materialCategoryToForm } from "@/features/admin/materials/materialCategoryForm";
import {
  EMPTY_CATEGORY_FORM,
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
  categories: MaterialCategory[];
  materials: MaterialRow[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function MaterialsCatalogPanel({
  dict,
  machDict,
  apiErrors,
  categories,
  materials,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  const labels = getCategoryAdminLabels("materials");
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();

  const categoryCrud = useCategoryAdminCrud({
    variant: "materials",
    apiErrors,
    apiErrorFallback: machDict.apiError,
    confirmDeleteMessage: labels.confirmDelete,
    createEmptyForm: () => ({ ...EMPTY_CATEGORY_FORM }),
    fetchData,
  });

  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matEditId, setMatEditId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MaterialItemFormState>(() => ({ ...EMPTY_MATERIAL_FORM }));

  const handleMatSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matForm.categoryIds.length === 0) {
      await appAlert({ message: dict.matCatRequired });
      return;
    }
    const url = matEditId ? `/api/materials/${matEditId}` : "/api/materials";
    const method = matEditId ? "PUT" : "POST";
    try {
      const res = await fetchWithDeviceTelemetry(
        matEditId ? `Admin materials: save material PUT ${matEditId}` : "Admin materials: save material POST",
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: matForm.name, categoryIds: matForm.categoryIds }),
        },
        { category: "admin" },
      );
      if (res.ok) {
        setIsMatModalOpen(false);
        void fetchData();
      } else {
        const err = (await res.json()) as { error?: string };
        await appAlert({ message: appDialogApiMessage(apiErrors, err.error, machDict.apiError) });
      }
    } catch {
      await appAlert({ message: machDict.apiError });
    }
  };

  const handleMatDelete = async (id: number) => {
    if (!(await appConfirm({ message: dict.confirmDelete, variant: "danger" }))) return;
    const res = await fetchWithDeviceTelemetry(
      `Admin materials: delete material ${id}`,
      `/api/materials/${id}`,
      { method: "DELETE" },
      { category: "admin" },
    );
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()) as { error?: string };
      await appAlert({ message: appDialogApiMessage(apiErrors, err.error, machDict.apiError) });
    }
  };

  const openNewMaterial = () => {
    setMatEditId(null);
    setMatForm({ ...EMPTY_MATERIAL_FORM });
    setIsMatModalOpen(true);
  };

  return (
    <>
      <ExpandableCatalogTree
        title={labels.panelTitle}
        subtitle={dict.catalogSubtitle}
        addCategoryLabel={labels.add}
        addMaterialLabel={dict.addMaterial}
        emptyLabel={labels.empty}
        groupBadge={labels.badgeGroup}
        treeStatCategories={labels.treeStatCategories}
        treeStatCategoriesShort={labels.treeStatCategoriesShort}
        treeStatMaterials={labels.treeStatMaterials}
        materialBadge={dict.materialBadge}
        uncategorizedTitle={dict.uncategorizedTitle}
        categories={categories}
        materials={materials}
        isLoading={isLoading}
        canMutate={canMutate}
        onAddCategory={categoryCrud.openNew}
        onAddMaterial={openNewMaterial}
        onEditCategory={(item) => categoryCrud.openEdit(item.id, materialCategoryToForm(item))}
        onDeleteCategory={categoryCrud.handleDelete}
        onEditMaterial={(material) => {
          setMatEditId(material.id);
          setMatForm({ name: material.name, categoryIds: material.categoryIds ?? [] });
          setIsMatModalOpen(true);
        }}
        onDeleteMaterial={handleMatDelete}
      />

      <MaterialCategoryFormModal
        open={categoryCrud.isOpen}
        onClose={categoryCrud.close}
        isEdit={categoryCrud.editId != null}
        categories={categories}
        editId={categoryCrud.editId}
        form={categoryCrud.form}
        setForm={categoryCrud.setForm}
        onSubmit={categoryCrud.handleSave}
      />

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
