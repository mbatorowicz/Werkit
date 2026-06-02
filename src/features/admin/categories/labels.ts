import { getDictionary } from "@/i18n";
import type { CategoryAdminLabels, CategoryAdminVariant } from "./types";

export function getCategoryAdminLabels(variant: CategoryAdminVariant): CategoryAdminLabels {
  const adminCat = getDictionary().admin.categories;
  if (variant === "spareParts") {
    const scope = getDictionary().dur.categories;
    return {
      ...adminCat.shared,
      ...scope.shared,
      panelTitle: scope.title,
      empty: scope.empty,
      confirmDelete: scope.confirmDelete,
      namePlaceholder: scope.namePlaceholder,
    };
  }
  const scope = variant === "workOrders" ? adminCat.workOrders : adminCat.materials;
  return {
    ...adminCat.shared,
    panelTitle: scope.panelTitle,
    empty: scope.empty,
    confirmDelete: scope.confirmDelete,
    namePlaceholder: scope.namePlaceholder,
  };
}
