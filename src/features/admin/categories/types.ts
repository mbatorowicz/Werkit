import type { CategoryHierarchyRow } from "@/lib/categoryTree";

export type CategoryAdminVariant = "workOrders" | "materials" | "spareParts";

export type CategoryAdminTreeItem = CategoryHierarchyRow & {
  color?: string | null;
  isStationary?: boolean;
};

export type CategoryHierarchyFormFields = {
  name: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
};

/** Etykiety panelu kategorii — wspólne (common) + modułowe rozszerzenia. */
export type CategoryAdminLabels = {
  panelTitle: string;
  empty: string;
  confirmDelete: string;
  namePlaceholder: string;
  add: string;
  save: string;
  modalEdit: string;
  modalCreate: string;
  badgeGroup: string;
  isGroupLabel: string;
  isGroupHint: string;
  parentLabel: string;
  parentNone: string;
  sortOrderLabel: string;
  colorLabel: string;
  colorHint: string;
  fieldName: string;
  previewTypeGroup: string;
  previewTypeCategory: string;
  catalogSearchPlaceholder: string;
  catalogSearchNoResults: string;
  treeStatCategories?: string;
  treeStatCategoriesShort?: string;
  treeStatMaterials?: string;
};
