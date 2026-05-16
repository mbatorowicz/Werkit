"use client";

import { useState, type ReactNode } from "react";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { ExpandableCatalogTree } from "@/components/Admin/ExpandableCatalogTree";
import { getDictionary } from "@/i18n";
import { getCategoryAdminLabels } from "./labels";
import { useCategoryAdminCrud } from "./useCategoryAdminCrud";
import type { CategoryAdminTreeItem, CategoryAdminVariant } from "./types";

type Props<TItem extends CategoryAdminTreeItem, TForm extends object> = {
  variant: CategoryAdminVariant;
  apiErrors: Record<string, string>;
  apiErrorFallback: string;
  items: TItem[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
  createEmptyForm: () => TForm;
  itemToForm: (item: TItem) => TForm;
  stationaryBadge?: string;
  renderModal: (ctx: {
    open: boolean;
    onClose: () => void;
    isEdit: boolean;
    editId: number | null;
    form: TForm;
    setForm: React.Dispatch<React.SetStateAction<TForm>>;
    categories: TItem[];
    onSubmit: (e: React.FormEvent) => void;
  }) => ReactNode;
};

export function CategoryAdminSection<TItem extends CategoryAdminTreeItem, TForm extends object>({
  variant,
  apiErrors,
  apiErrorFallback,
  items,
  isLoading,
  canMutate,
  fetchData,
  createEmptyForm,
  itemToForm,
  stationaryBadge,
  renderModal,
}: Props<TItem, TForm>) {
  const labels = getCategoryAdminLabels(variant);
  const shared = getDictionary().admin.categories.shared;
  const ui = getDictionary().admin.ui;
  const [previewItem, setPreviewItem] = useState<TItem | null>(null);
  const crud = useCategoryAdminCrud({
    variant,
    apiErrors,
    apiErrorFallback,
    confirmDeleteMessage: labels.confirmDelete,
    createEmptyForm,
    fetchData,
  });

  return (
    <>
      <ExpandableCatalogTree
        title={labels.panelTitle}
        addCategoryLabel={labels.add}
        emptyLabel={labels.empty}
        groupBadge={labels.badgeGroup}
        treeStatCategories={labels.treeStatCategories}
        treeStatCategoriesShort={labels.treeStatCategoriesShort}
        stationaryBadge={stationaryBadge}
        categories={items}
        isLoading={isLoading}
        canMutate={canMutate}
        onAddCategory={crud.openNew}
        onPreviewCategory={(item) => setPreviewItem(item)}
        onEditCategory={(item) => {
          setPreviewItem(null);
          crud.openEdit(item.id, itemToForm(item));
        }}
        onDeleteCategory={crud.handleDelete}
      />

      {renderModal({
        open: crud.isOpen,
        onClose: crud.close,
        isEdit: crud.editId != null,
        editId: crud.editId,
        form: crud.form,
        setForm: crud.setForm,
        categories: items,
        onSubmit: crud.handleSave,
      })}

      <AdminPreviewModal
        open={previewItem != null}
        onClose={() => setPreviewItem(null)}
        title={ui.previewTitle}
        canEdit={canMutate}
        onEdit={
          previewItem
            ? () => {
                setPreviewItem(null);
                crud.openEdit(previewItem.id, itemToForm(previewItem));
              }
            : undefined
        }
        editLabel={getDictionary().admin.machines.editTitle}
      >
        {previewItem ? (
          <>
            <AdminPreviewField label={shared.fieldName} value={previewItem.name} />
            <AdminPreviewField
              label={shared.isGroupLabel}
              value={previewItem.isGroup ? shared.previewTypeGroup : shared.previewTypeCategory}
            />
            {!previewItem.isGroup && previewItem.color ? (
              <AdminPreviewField label={shared.colorLabel}>
                <span
                  className="inline-flex items-center gap-2"
                >
                  <span
                    className="inline-block h-4 w-4 rounded shadow-sm"
                    style={{ backgroundColor: previewItem.color }}
                  />
                  {previewItem.color}
                </span>
              </AdminPreviewField>
            ) : null}
            <AdminPreviewField label="ID" value={`#${previewItem.id}`} />
          </>
        ) : null}
      </AdminPreviewModal>
    </>
  );
}
