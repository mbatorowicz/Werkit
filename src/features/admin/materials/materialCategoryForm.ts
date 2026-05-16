import { hierarchyFieldsFromRow } from "@/features/admin/categories/categoryHierarchyForm";
import type { MaterialCategory, MaterialCategoryFormState } from "./types";

export function materialCategoryToForm(cat: MaterialCategory): MaterialCategoryFormState {
  return {
    name: cat.name,
    ...hierarchyFieldsFromRow(cat),
    color: cat.color || "#3f3f46",
  };
}
