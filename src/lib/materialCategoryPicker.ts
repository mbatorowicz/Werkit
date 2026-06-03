/** Pomocnicze typy i filtry dla wyboru materiału z kategorią materiału. */

export type MaterialPickerRow = {
  id: number;
  name: string;
  categoryIds?: number[];
};

export type MaterialCategoryRow = {
  id: number;
  name: string;
};

export function filterMaterialsByMaterialCategory(
  materials: MaterialPickerRow[],
  materialCategoryId: string
): MaterialPickerRow[] {
  const cid = Number.parseInt(materialCategoryId, 10);
  if (!Number.isFinite(cid) || cid < 1) return [];
  return materials.filter((m) => m.categoryIds?.includes(cid));
}

/** Domyślna kategoria materiału przy edycji (pierwsza pasująca do materiału). */
export function inferMaterialCategoryId(
  materialId: string,
  materials: MaterialPickerRow[],
  preferredCategoryId?: string
): string {
  if (preferredCategoryId?.trim()) return preferredCategoryId.trim();
  const mid = Number.parseInt(materialId, 10);
  if (!Number.isFinite(mid)) return "";
  const row = materials.find((m) => m.id === mid);
  const first = row?.categoryIds?.[0];
  return first != null ? String(first) : "";
}

export const MATERIAL_CATEGORY_OPTION_PREFIX = "matcat:";

export function toMaterialCategoryOptionId(categoryId: number): string {
  return `${MATERIAL_CATEGORY_OPTION_PREFIX}${categoryId}`;
}

export function parseMaterialCategoryOptionId(optionId: string): number | null {
  if (!optionId.startsWith(MATERIAL_CATEGORY_OPTION_PREFIX)) return null;
  const n = Number.parseInt(optionId.slice(MATERIAL_CATEGORY_OPTION_PREFIX.length), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
