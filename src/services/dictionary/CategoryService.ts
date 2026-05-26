import { db } from '@/db';
import { isMissingResourceCategoriesVisibilityColumns } from '@/lib/postgresMigrationHints';
import { resourceCategories } from '@/db/schema';
import { eq, asc, desc, and, inArray } from 'drizzle-orm';
import { filterCategoryLeaves } from '@/lib/categoryTree';
import {
  CategoryHierarchyError,
  countResourceCategoryChildren,
  validateHierarchyPatch,
} from '@/services/categoryHierarchyValidation';

export class CategoryService {
  /** Zapytanie bez `show_*` — działa na bazie sprzed migracji 0010. */
  private static async getCategoriesLegacyColumnsOnly(companyId: number) {
    return db
      .select({
        id: resourceCategories.id,
        name: resourceCategories.name,
        icon: resourceCategories.icon,
        reqCustomer: resourceCategories.reqCustomer,
        reqMaterial: resourceCategories.reqMaterial,
        reqQuantity: resourceCategories.reqQuantity,
        reqTaskDescription: resourceCategories.reqTaskDescription,
        isGlobal: resourceCategories.isGlobal,
        isStationary: resourceCategories.isStationary,
        color: resourceCategories.color,
      })
      .from(resourceCategories)
      .where(eq(resourceCategories.companyId, companyId))
      .orderBy(desc(resourceCategories.id));
  }

  static async getCategories(companyId: number, opts?: { leavesOnly?: boolean }) {
    let rows;
    try {
      rows = await db
        .select()
        .from(resourceCategories)
        .where(eq(resourceCategories.companyId, companyId))
        .orderBy(asc(resourceCategories.sortOrder), asc(resourceCategories.id));
    } catch (err: unknown) {
      if (!isMissingResourceCategoriesVisibilityColumns(err)) throw err;
      console.warn(
        'CategoryService.getCategories: brak kolumn show_* na resource_categories — zapytanie legacy; uruchom migrację (npm run db:napraw-kategorie-widocznosc lub drizzle/0010).',
      );
      const legacy = await CategoryService.getCategoriesLegacyColumnsOnly(companyId);
      rows = legacy.map((row) => ({
        ...row,
        companyId,
        parentId: null,
        isGroup: false,
        sortOrder: 0,
        showCustomer: true,
        showMaterial: true,
        showQuantity: true,
        showTaskDescription: true,
        showResourceName: true,
        showResourceDescription: false,
        showRegistrationNumber: true,
      }));
    }
    return opts?.leavesOnly ? filterCategoryLeaves(rows) : rows;
  }

  static async addCategory(
    companyId: number,
    data: Partial<typeof resourceCategories.$inferInsert>,
  ) {
    const all = await CategoryService.getCategories(companyId);
    validateHierarchyPatch(all, {
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
    });
    await db.insert(resourceCategories).values({
      ...data,
      companyId,
    } as typeof resourceCategories.$inferInsert);
  }

  static async updateCategory(
    companyId: number,
    id: number,
    data: Partial<typeof resourceCategories.$inferInsert>,
  ) {
    const all = await CategoryService.getCategories(companyId);
    validateHierarchyPatch(
      all,
      { parentId: data.parentId, isGroup: data.isGroup },
      id,
    );
    const self = all.find((r) => r.id === id);
    if (self?.isGroup && data.isGroup === false) {
      const childCount = await countResourceCategoryChildren(id);
      if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    }
    await db
      .update(resourceCategories)
      .set(data)
      .where(and(eq(resourceCategories.id, id), eq(resourceCategories.companyId, companyId)));
  }

  static async deleteCategory(companyId: number, id: number) {
    const childCount = await countResourceCategoryChildren(id);
    if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    await db
      .delete(resourceCategories)
      .where(and(eq(resourceCategories.id, id), eq(resourceCategories.companyId, companyId)));
  }

  static async getResourceCategoryById(companyId: number, id: number) {
    const rows = await db
      .select()
      .from(resourceCategories)
      .where(and(eq(resourceCategories.id, id), eq(resourceCategories.companyId, companyId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Łączenie widoczności pól zasobu — pole widoczne, jeśli któraś z wybranych kategorii je pokazuje. */
  static async mergeResourceFormVisibility(
    companyId: number,
    categoryIds: number[],
  ): Promise<{
    showResourceName: boolean;
    showResourceDescription: boolean;
    showRegistrationNumber: boolean;
  }> {
    const ids = categoryIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return {
        showResourceName: true,
        showResourceDescription: true,
        showRegistrationNumber: true,
      };
    }
    const cats = await db
      .select({
        showResourceName: resourceCategories.showResourceName,
        showResourceDescription: resourceCategories.showResourceDescription,
        showRegistrationNumber: resourceCategories.showRegistrationNumber,
      })
      .from(resourceCategories)
      .where(
        and(
          eq(resourceCategories.companyId, companyId),
          inArray(resourceCategories.id, ids),
        ),
      );
    if (cats.length === 0) {
      return {
        showResourceName: true,
        showResourceDescription: true,
        showRegistrationNumber: true,
      };
    }
    return {
      showResourceName: cats.some((c) => c.showResourceName),
      showResourceDescription: cats.some((c) => c.showResourceDescription),
      showRegistrationNumber: cats.some((c) => c.showRegistrationNumber),
    };
  }
}

export { CategoryHierarchyError } from '@/services/categoryHierarchyValidation';

/** Payload aktualizacji kategorii zasobów — do importu w Route Handlers bez `@/db/schema`. */
export type ResourceCategoryUpdateInput = Partial<typeof resourceCategories.$inferInsert>;
