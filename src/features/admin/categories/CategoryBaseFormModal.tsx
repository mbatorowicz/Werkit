"use client";

import type { ReactNode } from "react";
import { CategoryHierarchyFields } from "@/components/Admin/CategoryHierarchyFields";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { INPUT_BASE } from "@/lib/uiTokens";
import type { CategoryHierarchyRow } from "@/lib/categoryTree";
import type { CategoryAdminLabels, CategoryHierarchyFormFields } from "./types";

type Props<TForm extends CategoryHierarchyFormFields> = {
  formId: string;
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  labels: CategoryAdminLabels;
  form: TForm;
  setForm: React.Dispatch<React.SetStateAction<TForm>>;
  categories: CategoryHierarchyRow[];
  excludeId?: number | null;
  onSubmit: (e: React.FormEvent) => void;
  children?: ReactNode;
};

export function CategoryBaseFormModal<TForm extends CategoryHierarchyFormFields>({
  formId,
  open,
  onClose,
  isEdit,
  labels,
  form,
  setForm,
  categories,
  excludeId,
  onSubmit,
  children,
}: Props<TForm>) {
  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? labels.modalEdit : labels.modalCreate}
      maxWidthClass="max-w-sm"
      titleSize="sm"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter formId={formId} onCancel={onClose} submitLabel={labels.save} />
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4 p-6">
        <input
          required
          type="text"
          placeholder={labels.namePlaceholder}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={INPUT_BASE}
        />

        <CategoryHierarchyFields
          parentId={form.parentId}
          isGroup={form.isGroup}
          sortOrder={form.sortOrder}
          categories={categories}
          excludeId={excludeId}
          onParentIdChange={(parentId) => setForm({ ...form, parentId })}
          onIsGroupChange={(isGroup) => setForm({ ...form, isGroup })}
          onSortOrderChange={(sortOrder) => setForm({ ...form, sortOrder })}
        />

        {children}
      </form>
    </AdminModalShell>
  );
}
