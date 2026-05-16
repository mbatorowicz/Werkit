"use client";

import type { ReactNode } from "react";
import { ExpandableCatalogTree } from "@/components/Admin/ExpandableCatalogTree";
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
        subtitle={labels.panelSubtitle}
        addCategoryLabel={labels.add}
        emptyLabel={labels.empty}
        groupBadge={labels.badgeGroup}
        stationaryBadge={stationaryBadge}
        categories={items}
        isLoading={isLoading}
        canMutate={canMutate}
        onAddCategory={crud.openNew}
        onEditCategory={(item) => crud.openEdit(item.id, itemToForm(item))}
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
    </>
  );
}
