/**
 * Typy domenowe modułu DUR (Dział Utrzymania Ruchu).
 * Magazyn części zamiennych, kategorie, kompatybilność z maszynami.
 */

/** Kategoria części zamiennej (węzeł drzewa). */
export type SparePartCategory = {
  id: number;
  companyId: number;
  name: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
  color: string | null;
};

/** Część zamienna. */
export type SparePart = {
  id: number;
  companyId: number;
  name: string;
  catalogNumber: string;
  manufacturer: string;
  unit: string;
  purchasePrice: string | null;
  description: string | null;
  minStock: string;
  location: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  /** Kategorie części (z linku N:M). */
  categoryIds: number[];
  /** Kategorie maszyn do których część pasuje. */
  machineCategoryIds: number[];
};

/** Kompatybilność części z kategorią maszyny. */
export type SparePartMachineCompatibility = {
  partId: number;
  categoryId: number;
  notes: string | null;
};

/** Payload do tworzenia/edycji części. */
export type SparePartInput = {
  name: string;
  catalogNumber?: string;
  manufacturer?: string;
  unit?: string;
  purchasePrice?: string | null;
  description?: string | null;
  minStock?: string;
  location?: string;
  imageUrl?: string | null;
  isActive?: boolean;
  categoryIds?: number[];
  machineCategoryIds?: number[];
};

/** Payload do tworzenia/edycji kategorii części. */
export type SparePartCategoryInput = {
  name: string;
  parentId?: number | null;
  isGroup?: boolean;
  sortOrder?: number;
  color?: string;
};

/** Payload do dodawania kompatybilności. */
export type SparePartCompatibilityInput = {
  partId: number;
  categoryId: number;
  notes?: string;
};
