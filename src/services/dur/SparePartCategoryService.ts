import { db } from '@/db';
import { sparePartCategories } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { filterCategoryLeaves } from '@/lib/categoryTree';
import {
  CategoryHierarchyError,
  countSparePartCategoryChildren,
  validateHierarchyPatch,
} from '@/services/dur/categoryValidation';

export class SparePartCategoryService {
  static async getCategories(companyId: number, opts?: { leavesOnly?: boolean }) {
    const rows = await db
      .select()
      .from(sparePartCategories)
      .where(eq(sparePartCategories.companyId, companyId))
      .orderBy(asc(sparePartCategories.sortOrder), asc(sparePartCategories.id));
    return opts?.leavesOnly ? filterCategoryLeaves(rows) : rows;
  }

  static async addCategory(
    companyId: number,
    data: Partial<typeof sparePartCategories.$inferInsert>,
  ) {
    const all = await SparePartCategoryService.getCategories(companyId);
    validateHierarchyPatch(all, {
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
    });
    await db.insert(sparePartCategories).values({
      companyId,
      name: (data.name ?? '').trim(),
      color: data.color || '#3f3f46',
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
      sortOrder: data.sortOrder ?? 0,
    } as typeof sparePartCategories.$inferInsert);
  }

  static async updateCategory(
    companyId: number,
    id: number,
    data: Partial<typeof sparePartCategories.$inferInsert>,
  ) {
    const all = await SparePartCategoryService.getCategories(companyId);
    validateHierarchyPatch(
      all,
      { parentId: data.parentId, isGroup: data.isGroup },
      id,
    );
    const self = all.find((r) => r.id === id);
    if (self?.isGroup && data.isGroup === false) {
      const childCount = await countSparePartCategoryChildren(id);
      if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    }
    await db
      .update(sparePartCategories)
      .set(data)
      .where(and(eq(sparePartCategories.id, id), eq(sparePartCategories.companyId, companyId)));
  }

  static async deleteCategory(companyId: number, id: number) {
    const childCount = await countSparePartCategoryChildren(id);
    if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    await db
      .delete(sparePartCategories)
      .where(and(eq(sparePartCategories.id, id), eq(sparePartCategories.companyId, companyId)));
  }
}

/** Payload aktualizacji kategorii części — bez importu schematu w kontrolerze. */
export type SparePartCategoryUpdateInput = Partial<typeof sparePartCategories.$inferInsert>;
