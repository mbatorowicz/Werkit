import { hierarchyFieldsFromRow } from "@/features/admin/categories/categoryHierarchyForm";
import { DEFAULT_CATEGORY_COLOR, resolveCategoryColorForForm } from "@/lib/categoryColorStyles";
import type { SparePartCategory } from "@/types/dur";

export type SparePartCategoryFormState = {
  name: string;
  color: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
};

export const EMPTY_SPARE_PART_CATEGORY_FORM: SparePartCategoryFormState = {
  name: "",
  color: DEFAULT_CATEGORY_COLOR,
  parentId: null,
  isGroup: false,
  sortOrder: 0,
};

export function sparePartCategoryToForm(cat: SparePartCategory): SparePartCategoryFormState {
  return {
    name: cat.name,
    ...hierarchyFieldsFromRow(cat),
    color: resolveCategoryColorForForm(cat.color),
  };
}
