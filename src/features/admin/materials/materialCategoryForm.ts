import type { MaterialCategory, MaterialCategoryFormState } from "./types";

export function materialCategoryToForm(cat: MaterialCategory): MaterialCategoryFormState {
  return {
    name: cat.name,
    color: cat.color || "#3f3f46",
    parentId: cat.parentId,
    isGroup: cat.isGroup,
    sortOrder: cat.sortOrder,
  };
}
