import type { CategoryHierarchyRow } from "@/lib/categoryTree";
import type { CategoryHierarchyFormFields } from "./types";

export function hierarchyFieldsFromRow(row: CategoryHierarchyRow): Pick<
  CategoryHierarchyFormFields,
  "parentId" | "isGroup" | "sortOrder"
> {
  return {
    parentId: row.parentId,
    isGroup: row.isGroup,
    sortOrder: row.sortOrder,
  };
}

export const EMPTY_HIERARCHY_FIELDS: Pick<CategoryHierarchyFormFields, "parentId" | "isGroup" | "sortOrder"> = {
  parentId: null,
  isGroup: false,
  sortOrder: 0,
};
