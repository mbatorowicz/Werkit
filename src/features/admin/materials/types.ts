import { DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColorStyles";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";

export type MaterialCategory = {
  id: number;
  name: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
  color?: string | null;
};
export type MaterialRow = {
  id: number;
  name: string;
  unit: string;
  categoryIds?: number[];
  stockQuantity?: string;
  minStock?: string | null;
  location?: string | null;
};

export type MaterialCategoryFormState = {
  name: string;
  color: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
};
export type MaterialItemFormState = {
  name: string;
  categoryIds: number[];
  unit: string;
  minStock: string;
  location: string;
};

export const EMPTY_CATEGORY_FORM: MaterialCategoryFormState = {
  name: "",
  color: DEFAULT_CATEGORY_COLOR,
  parentId: null,
  isGroup: false,
  sortOrder: 0,
};
export const EMPTY_MATERIAL_FORM: MaterialItemFormState = {
  name: "",
  categoryIds: [],
  unit: DEFAULT_MATERIAL_MEASURE_UNIT,
  minStock: "",
  location: "",
};
