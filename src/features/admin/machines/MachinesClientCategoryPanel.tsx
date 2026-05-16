"use client";

import type { AppDictionary } from "@/i18n/types";
import { CategoryAdminSection } from "@/features/admin/categories/CategoryAdminSection";
import { ResourceCategoryFormModal } from "@/features/admin/machines/ResourceCategoryFormModal";
import { resourceCategoryToForm } from "@/features/admin/machines/resourceCategoryForm";
import { EMPTY_CATEGORY_FORM, type MachinesCategory } from "@/features/admin/machines/types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  apiErrors: Record<string, string>;
  categories: MachinesCategory[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function MachinesClientCategoryPanel({
  dict,
  apiErrors,
  categories,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  return (
    <CategoryAdminSection
      variant="workOrders"
      apiErrors={apiErrors}
      apiErrorFallback={dict.apiError}
      items={categories}
      isLoading={isLoading}
      canMutate={canMutate}
      fetchData={fetchData}
      createEmptyForm={() => ({ ...EMPTY_CATEGORY_FORM })}
      itemToForm={resourceCategoryToForm}
      stationaryBadge={dict.badgeStationary}
      renderModal={({ open, onClose, isEdit, editId, form, setForm, categories: tree, onSubmit }) => (
        <ResourceCategoryFormModal
          open={open}
          onClose={onClose}
          isEdit={isEdit}
          dict={dict}
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
