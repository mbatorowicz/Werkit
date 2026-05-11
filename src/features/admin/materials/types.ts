export type MaterialCategory = { id: number; name: string; color?: string | null };
export type MaterialRow = { id: number; name: string; categoryIds?: number[] };

export type MaterialCategoryFormState = { name: string; color: string };
export type MaterialItemFormState = { name: string; categoryIds: number[] };

export const EMPTY_CATEGORY_FORM: MaterialCategoryFormState = { name: "", color: "#3f3f46" };
export const EMPTY_MATERIAL_FORM: MaterialItemFormState = { name: "", categoryIds: [] };
