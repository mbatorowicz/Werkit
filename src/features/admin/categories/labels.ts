import { getDictionary } from "@/i18n";
import type { CategoryAdminLabels, CategoryAdminVariant } from "./types";

export function getCategoryAdminLabels(variant: CategoryAdminVariant): CategoryAdminLabels {
  const { shared, workOrders, materials } = getDictionary().admin.categories;
  const scope = variant === "workOrders" ? workOrders : materials;
  return {
    ...shared,
    panelTitle: scope.panelTitle,
    empty: scope.empty,
    confirmDelete: scope.confirmDelete,
    namePlaceholder: scope.namePlaceholder,
  };
}
