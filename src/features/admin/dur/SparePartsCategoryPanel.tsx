"use client";

import { CategoryAdminSection } from "@/features/admin/categories/CategoryAdminSection";
import type { SparePartCategory } from "@/types/dur";
import { SparePartCategoryFormModal } from "./SparePartCategoryFormModal";
import { EMPTY_SPARE_PART_CATEGORY_FORM, sparePartCategoryToForm } from "./sparePartCategoryForm";

type Props = {
  apiErrors: Record<string, string>;
  apiErrorFallback: string;
  categories: SparePartCategory[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function SparePartsCategoryPanel({
  apiErrors,
  apiErrorFallback,
  categories,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  return (
    <CategoryAdminSection
      variant="spareParts"
      apiErrors={apiErrors}
      apiErrorFallback={apiErrorFallback}
      items={categories}
      isLoading={isLoading}
      canMutate={canMutate}
      fetchData={fetchData}
      createEmptyForm={() => ({ ...EMPTY_SPARE_PART_CATEGORY_FORM })}
      itemToForm={sparePartCategoryToForm}
      renderModal={({
        open,
        onClose,
        isEdit,
        editId,
        form,
        setForm,
        categories: tree,
        onSubmit,
      }) => (
        <SparePartCategoryFormModal
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
