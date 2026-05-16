import { db } from "@/db";
import { materialCategories, resourceCategories } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { isDescendantOf, type CategoryHierarchyRow } from "@/lib/categoryTree";

export class CategoryHierarchyError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

type HierarchyPatch = {
  parentId?: number | null;
  isGroup?: boolean;
};

function normalizeParentId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseHierarchyFields(body: Record<string, unknown>): {
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
} {
  const parentId = normalizeParentId(body.parentId);
  const isGroup = body.isGroup === true;
  const sortOrderRaw = body.sortOrder;
  const sortOrder =
    typeof sortOrderRaw === "number" && Number.isFinite(sortOrderRaw)
      ? Math.max(0, Math.floor(sortOrderRaw))
      : 0;
  return { parentId, isGroup, sortOrder };
}

export function validateHierarchyPatch<T extends CategoryHierarchyRow>(
  allRows: T[],
  patch: HierarchyPatch,
  selfId?: number,
): void {
  const self = selfId != null ? allRows.find((r) => r.id === selfId) : undefined;
  const parentId = patch.parentId !== undefined ? patch.parentId : (self?.parentId ?? null);
  const isGroup = patch.isGroup !== undefined ? patch.isGroup : (self?.isGroup ?? false);

  if (parentId != null && selfId != null && parentId === selfId) {
    throw new CategoryHierarchyError("invalid_parent");
  }

  if (parentId != null) {
    const parent = allRows.find((r) => r.id === parentId);
    if (!parent) throw new CategoryHierarchyError("invalid_parent");
    if (!parent.isGroup) throw new CategoryHierarchyError("parent_must_be_group");
    if (selfId != null && isDescendantOf(allRows, parentId, selfId)) {
      throw new CategoryHierarchyError("invalid_parent");
    }
  }

  if (!isGroup && parentId == null && selfId != null) {
    const hasChildren = allRows.some((r) => r.parentId === selfId);
    if (hasChildren) throw new CategoryHierarchyError("group_has_children");
  }
}

export async function assertResourceCategoryAssignable(categoryId: number): Promise<void> {
  const row = await db.select().from(resourceCategories).where(eq(resourceCategories.id, categoryId)).limit(1);
  const cat = row[0];
  if (!cat) throw new CategoryHierarchyError("invalid_category");
  if (cat.isGroup) throw new CategoryHierarchyError("invalid_category");
}

export async function assertMaterialCategoriesAssignable(categoryIds: number[]): Promise<void> {
  const ids = [...new Set(categoryIds.filter((n) => Number.isFinite(n) && n > 0))];
  if (ids.length === 0) return;
  const all = await db.select().from(materialCategories).where(inArray(materialCategories.id, ids));
  if (all.length !== ids.length) throw new CategoryHierarchyError("invalid_category");
  if (all.some((r) => r.isGroup)) throw new CategoryHierarchyError("invalid_category");
}

export async function countResourceCategoryChildren(id: number): Promise<number> {
  const rows = await db
    .select({ id: resourceCategories.id })
    .from(resourceCategories)
    .where(eq(resourceCategories.parentId, id));
  return rows.length;
}

export async function countMaterialCategoryChildren(id: number): Promise<number> {
  const rows = await db
    .select({ id: materialCategories.id })
    .from(materialCategories)
    .where(eq(materialCategories.parentId, id));
  return rows.length;
}
