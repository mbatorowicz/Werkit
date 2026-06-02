"use client";

import { AdminCategoryColorFieldRow } from "@/components/Admin/AdminCategoryColorFieldRow";
import { CategoryBaseFormModal } from "@/features/admin/categories/CategoryBaseFormModal";
import { getCategoryAdminLabels } from "@/features/admin/categories/labels";
import { getDictionary } from "@/i18n";
import type { SparePartCategory } from "@/types/dur";
import type { SparePartCategoryFormState } from "./sparePartCategoryForm";

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  categories: SparePartCategory[];
  editId: number | null;
  form: SparePartCategoryFormState;
  setForm: React.Dispatch<React.SetStateAction<SparePartCategoryFormState>>;
  onSubmit: (e: React.FormEvent) => void;
};

export function SparePartCategoryFormModal({
  open,
  onClose,
  isEdit,
  categories,
  editId,
  form,
  setForm,
  onSubmit,
}: Props) {
  const labels = getCategoryAdminLabels("spareParts");
  const shared = getDictionary().dur.categories.shared;

  return (
    <CategoryBaseFormModal
      formId="admin-spare-part-category-form"
      open={open}
      onClose={onClose}
      isEdit={isEdit}
      labels={labels}
      submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-900 dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-white transition flex items-center justify-center min-w-[7rem]"
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
