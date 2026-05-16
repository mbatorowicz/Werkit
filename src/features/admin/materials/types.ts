export type MaterialCategory = {
  id: number;
  name: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
  color?: string | null;
};
export type MaterialRow = { id: number; name: string; categoryIds?: number[] };

export type MaterialCategoryFormState = {
  name: string;
  color: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
};
export type MaterialItemFormState = { name: string; categoryIds: number[] };

export const EMPTY_CATEGORY_FORM: MaterialCategoryFormState = {
  name: "",
  color: "#3f3f46",
  parentId: null,
  isGroup: false,
  sortOrder: 0,
};
export const EMPTY_MATERIAL_FORM: MaterialItemFormState = { name: "", categoryIds: [] };
