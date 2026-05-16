import type { CategoryHierarchyRow } from "@/lib/categoryTree";

export type CategoryAdminVariant = "workOrders" | "materials";

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

export type CategoryAdminLabels = {
  panelTitle: string;
  panelSubtitle: string;
  add: string;
  empty: string;
  confirmDelete: string;
  modalEdit: string;
  modalCreate: string;
  namePlaceholder: string;
  save: string;
  badgeGroup: string;
  treeStatCategories: string;
  treeStatCategoriesShort: string;
  treeStatMaterials: string;
};
