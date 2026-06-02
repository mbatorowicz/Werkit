import { hierarchyFieldsFromRow } from "@/features/admin/categories/categoryHierarchyForm";
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
  color: "#a1a1aa",
  parentId: null,
  isGroup: false,
  sortOrder: 0,
};

export function sparePartCategoryToForm(cat: SparePartCategory): SparePartCategoryFormState {
  return {
    name: cat.name,
    ...hierarchyFieldsFromRow(cat),
    color: cat.color ?? "#a1a1aa",
  };
}
