import { db } from '@/db';
import { sparePartCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isDescendantOf, type CategoryHierarchyRow } from '@/lib/categoryTree';

export class CategoryHierarchyError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

type HierarchyPatch = {
  parentId?: number | null;
  isGroup?: boolean;
};

export function validateHierarchyPatch<T extends CategoryHierarchyRow>(
  allRows: T[],
  patch: HierarchyPatch,
  selfId?: number,
): void {
  const self = selfId != null ? allRows.find((r) => r.id === selfId) : undefined;
  const parentId = patch.parentId !== undefined ? patch.parentId : (self?.parentId ?? null);
  const isGroup = patch.isGroup !== undefined ? patch.isGroup : (self?.isGroup ?? false);

  if (parentId != null && selfId != null && parentId === selfId) {
    throw new CategoryHierarchyError('invalid_parent');
  }

  if (parentId != null) {
    const parent = allRows.find((r) => r.id === parentId);
    if (!parent) throw new CategoryHierarchyError('invalid_parent');
    if (!parent.isGroup) throw new CategoryHierarchyError('parent_must_be_group');
    if (selfId != null && isDescendantOf(allRows, parentId, selfId)) {
      throw new CategoryHierarchyError('invalid_parent');
    }
  }

  if (!isGroup && parentId == null && selfId != null) {
    const hasChildren = allRows.some((r) => r.parentId === selfId);
    if (hasChildren) throw new CategoryHierarchyError('group_has_children');
  }
}

export async function countSparePartCategoryChildren(id: number): Promise<number> {
  const rows = await db
    .select({ id: sparePartCategories.id })
    .from(sparePartCategories)
    .where(eq(sparePartCategories.parentId, id));
  return rows.length;
}

export async function assertSparePartCategoriesAssignable(
  categoryIds: number[],
  companyId: number,
): Promise<void> {
  const ids = [...new Set(categoryIds.filter((n) => Number.isFinite(n) && n > 0))];
  if (ids.length === 0) return;
  const { and, inArray } = await import('drizzle-orm');
  const all = await db
    .select()
    .from(sparePartCategories)
    .where(
      and(eq(sparePartCategories.companyId, companyId), inArray(sparePartCategories.id, ids)),
    );
  if (all.length !== ids.length) throw new CategoryHierarchyError('invalid_category');
  if (all.some((r) => r.isGroup)) throw new CategoryHierarchyError('invalid_category');
}
