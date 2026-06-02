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
  /** Grupy maszyn (typy zasobów) do których część pasuje. */
  resourceGroupIds: number[];
  /** @deprecated alias — użyj resourceGroupIds */
  machineCategoryIds?: number[];
  /** Stan magazynowy (gdy API zwraca katalog ze stanem). */
  stockQuantity?: string;
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
  resourceGroupIds?: number[];
  /** @deprecated */
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

// ── DUR — Faza 2: Gospodarka magazynowa ──

/** Stan magazynowy części. */
export type SparePartInventory = {
  id: number;
  companyId: number;
  partId: number;
  quantity: string;
  updatedAt: string;
  /** Rozszerzone: nazwa części (JOIN). */
  partName?: string;
  partCatalogNumber?: string;
  partUnit?: string;
};

/** Przyjęcie towaru (PZ). */
export type StockReceipt = {
  id: number;
  companyId: number;
  partId: number;
  quantity: string;
  unitPrice: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  /** Rozszerzone: nazwa części (JOIN). */
  partName?: string;
  partCatalogNumber?: string;
  creatorName?: string;
};

/** Wydanie towaru (WZ / rozchód wewnętrzny). */
export type StockIssue = {
  id: number;
  companyId: number;
  partId: number;
  quantity: string;
  workOrderId: number | null;
  issuedTo: number | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  /** Rozszerzone: nazwa części (JOIN). */
  partName?: string;
  partCatalogNumber?: string;
  creatorName?: string;
  workOrderLabel?: string;
};

// ── Inputy ──

/** Payload przyjęcia towaru. */
export type StockReceiptInput = {
  partId: number;
  quantity: string;
  unitPrice?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  workOrderSparePartId?: number | null;
};

/** Payload wydania towaru. */
export type StockIssueInput = {
  partId: number;
  quantity: string;
  workOrderId?: number | null;
  issuedTo?: number | null;
  notes?: string | null;
  workOrderSparePartId?: number | null;
};

/** Payload korekty stanu magazynowego. */
export type InventoryAdjustmentInput = {
  partId: number;
  quantity: string;
  notes?: string | null;
};
