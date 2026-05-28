/**
 * Type narrowing dla odpowiedzi API modułu DUR (magazyn części).
 * Zgodnie z AGENTS.md §4 pkt 7 — odpowiedzi API parsuj przez funkcje narrow*.
 */
import { isRecord } from './shared';
import type { SparePart, SparePartCategory } from '@/types/dur';

function readString(r: Record<string, unknown>, k: string, fallback = ''): string {
  return typeof r[k] === 'string' ? r[k] : fallback;
}

function readNullableString(r: Record<string, unknown>, k: string): string | null {
  const v = r[k];
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v : null;
}

function readNumber(r: Record<string, unknown>, k: string, fallback = 0): number {
  const v = r[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function readBool(r: Record<string, unknown>, k: string, fallback = false): boolean {
  return typeof r[k] === 'boolean' ? r[k] : fallback;
}

function readNumberArray(r: Record<string, unknown>, k: string): number[] {
  const v = r[k];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is number => typeof x === 'number');
}

function narrowSparePartRaw(r: Record<string, unknown>): SparePart | null {
  if (!r.id || !r.name) return null;
  return {
    id: readNumber(r, 'id'),
    companyId: readNumber(r, 'companyId'),
    name: readString(r, 'name'),
    catalogNumber: readString(r, 'catalogNumber'),
    manufacturer: readString(r, 'manufacturer'),
    unit: readString(r, 'unit', 'szt'),
    purchasePrice: readNullableString(r, 'purchasePrice'),
    description: readNullableString(r, 'description'),
    minStock: readString(r, 'minStock', '0'),
    location: readString(r, 'location'),
    imageUrl: readNullableString(r, 'imageUrl'),
    isActive: readBool(r, 'isActive', true),
    createdAt: readString(r, 'createdAt'),
    categoryIds: readNumberArray(r, 'categoryIds'),
    machineCategoryIds: readNumberArray(r, 'machineCategoryIds'),
  };
}

/**
 * Bezpieczne parsowanie odpowiedzi API z listą części.
 * Zwraca przefiltrowaną tablicę — pomija nieprawidłowe wpisy.
 */
export function narrowSpareParts(data: unknown): SparePart[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => (isRecord(item) ? narrowSparePartRaw(item) : null))
    .filter((x): x is SparePart => x !== null);
}

/**
 * Bezpieczne parsowanie pojedynczej części z odpowiedzi API.
 */
export function narrowSparePart(data: unknown): SparePart | null {
  if (!isRecord(data)) return null;
  return narrowSparePartRaw(data);
}

function narrowSparePartCategoryRaw(r: Record<string, unknown>): SparePartCategory | null {
  if (!r.id || !r.name) return null;
  return {
    id: readNumber(r, 'id'),
    companyId: readNumber(r, 'companyId'),
    name: readString(r, 'name'),
    parentId: r.parentId != null ? readNumber(r, 'parentId') : null,
    isGroup: readBool(r, 'isGroup'),
    sortOrder: readNumber(r, 'sortOrder'),
    color: readNullableString(r, 'color'),
  };
}

/**
 * Bezpieczne parsowanie odpowiedzi API z listą kategorii części.
 */
export function narrowSparePartCategories(data: unknown): SparePartCategory[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => (isRecord(item) ? narrowSparePartCategoryRaw(item) : null))
    .filter((x): x is SparePartCategory => x !== null);
}

/**
 * Bezpieczne parsowanie odpowiedzi API z kompatybilnością.
 */
export function narrowSparePartCompatibility(data: unknown): {
  categoryId: number;
  notes: string | null;
  categoryName?: string;
}[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (!isRecord(item)) return null;
      return {
        categoryId: readNumber(item, 'categoryId'),
        notes: readNullableString(item, 'notes'),
        categoryName: readNullableString(item, 'categoryName') ?? undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
