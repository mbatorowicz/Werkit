"use client";

import { AdminCategoryColorFieldRow } from "@/components/Admin/AdminCategoryColorFieldRow";
import { CategoryBaseFormModal } from "@/features/admin/categories/CategoryBaseFormModal";
import { getCategoryAdminLabels } from "@/features/admin/categories/labels";
import { useAppLocale } from "@/i18n";
import type { MaterialCategory, MaterialCategoryFormState } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  categories: MaterialCategory[];
  editId: number | null;
  form: MaterialCategoryFormState;
  setForm: React.Dispatch<React.SetStateAction<MaterialCategoryFormState>>;
  onSubmit: (e: React.FormEvent) => void;
};

export function MaterialCategoryFormModal({
  open,
  onClose,
  isEdit,
  categories,
  editId,
  form,
  setForm,
  onSubmit,
}: Props) {
  const locale = useAppLocale();
  const labels = getCategoryAdminLabels("materials", locale);
  const shared = labels;

  return (
    <CategoryBaseFormModal
      formId="admin-material-category-form"
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
      <AdminCategoryColorFieldRow
        color={form.color}
        onColorChange={(color) => setForm({ ...form, color })}
        label={shared.colorLabel}
        hint={shared.colorHint}
      />
    </CategoryBaseFormModal>
  );
}
