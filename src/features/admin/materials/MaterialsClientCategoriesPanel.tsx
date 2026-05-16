"use client";

import type { AppDictionary } from "@/i18n/types";
import { CategoryAdminSection } from "@/features/admin/categories/CategoryAdminSection";
import { MaterialCategoryFormModal } from "@/features/admin/materials/MaterialCategoryFormModal";
import { materialCategoryToForm } from "@/features/admin/materials/materialCategoryForm";
import { EMPTY_CATEGORY_FORM, type MaterialCategory } from "@/features/admin/materials/types";

type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  machDict: MachDict;
  apiErrors: Record<string, string>;
  categories: MaterialCategory[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function MaterialsClientCategoriesPanel({
  machDict,
  apiErrors,
  categories,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  return (
    <CategoryAdminSection
      variant="materials"
      apiErrors={apiErrors}
      apiErrorFallback={machDict.apiError}
      items={categories}
      isLoading={isLoading}
      canMutate={canMutate}
      fetchData={fetchData}
      createEmptyForm={() => ({ ...EMPTY_CATEGORY_FORM })}
      itemToForm={materialCategoryToForm}
      renderModal={({ open, onClose, isEdit, editId, form, setForm, categories: tree, onSubmit }) => (
        <MaterialCategoryFormModal
          open={open}
          onClose={onClose}
          isEdit={isEdit}
          categories={tree}
          editId={editId}
          form={form}
          setForm={setForm}
          onSubmit={onSubmit}
        />
      )}
    />
  );
}
