import { getDictionary, type Locale } from "@/i18n";
import { categorySharedLabels } from "@/lib/categoryI18n";
import type { CategoryAdminLabels, CategoryAdminVariant } from "./types";

export function getCategoryAdminLabels(
  variant: CategoryAdminVariant,
  locale?: Locale
): CategoryAdminLabels {
  const dict = getDictionary(locale);
  const adminCat = dict.admin.categories;
  if (variant === "spareParts") {
    const scope = dict.dur.categories;
    return {
      ...categorySharedLabels(dict, "dur"),
      panelTitle: scope.title,
      empty: scope.empty,
      confirmDelete: scope.confirmDelete,
      namePlaceholder: scope.namePlaceholder,
    };
  }
  const scope = variant === "workOrders" ? adminCat.workOrders : adminCat.materials;
  return {
    ...categorySharedLabels(dict, "admin"),
    panelTitle: scope.panelTitle,
    empty: scope.empty,
    confirmDelete: scope.confirmDelete,
    namePlaceholder: scope.namePlaceholder,
  };
}
