import { hierarchyFieldsFromRow } from "@/features/admin/categories/categoryHierarchyForm";
import { resolveCategoryColorForForm } from "@/lib/categoryColorStyles";
import type { MaterialCategory, MaterialCategoryFormState } from "./types";

export function materialCategoryToForm(cat: MaterialCategory): MaterialCategoryFormState {
  return {
    name: cat.name,
    ...hierarchyFieldsFromRow(cat),
    color: resolveCategoryColorForForm(cat.color),
  };
}
