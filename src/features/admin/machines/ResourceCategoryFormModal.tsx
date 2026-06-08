"use client";

import type { AppDictionary } from "@/i18n/types";
import { CategoryBaseFormModal } from "@/features/admin/categories/CategoryBaseFormModal";
import { getCategoryAdminLabels } from "@/features/admin/categories/labels";
import { useAppLocale } from "@/i18n";
import { ResourceCategoryLeafFields } from "@/features/admin/machines/ResourceCategoryLeafFields";
import type { CategoryFormState, MachinesCategory } from "./types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  dict: Dict;
  categories: MachinesCategory[];
  editId: number | null;
  form: CategoryFormState;
  setForm: React.Dispatch<React.SetStateAction<CategoryFormState>>;
  onSubmit: (e: React.FormEvent) => void;
};

export function ResourceCategoryFormModal({
  open,
  onClose,
  isEdit,
  dict,
  categories,
  editId,
  form,
  setForm,
  onSubmit,
}: Props) {
  const locale = useAppLocale();
  const labels = getCategoryAdminLabels("workOrders", locale);

  return (
    <CategoryBaseFormModal
      formId="admin-resource-category-form"
      open={open}
      onClose={onClose}
      isEdit={isEdit}
      labels={labels}
      form={form}
      setForm={setForm}
      categories={categories}
      excludeId={editId}
      onSubmit={onSubmit}
    >
      <ResourceCategoryLeafFields dict={dict} form={form} setForm={setForm} />
    </CategoryBaseFormModal>
  );
}
