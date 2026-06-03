import { db } from "@/db";
import { materialCategories } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColorStyles";
import { filterCategoryLeaves } from "@/lib/categoryTree";
import {
  CategoryHierarchyError,
  countMaterialCategoryChildren,
  validateHierarchyPatch,
} from "@/services/categoryHierarchyValidation";

export class MaterialCategoryService {
  static async getMaterialCategories(companyId: number, opts?: { leavesOnly?: boolean }) {
    const rows = await db
      .select()
      .from(materialCategories)
      .where(eq(materialCategories.companyId, companyId))
      .orderBy(asc(materialCategories.sortOrder), asc(materialCategories.id));
    return opts?.leavesOnly ? filterCategoryLeaves(rows) : rows;
  }

  static async addMaterialCategory(
    companyId: number,
    data: Partial<typeof materialCategories.$inferInsert>
  ) {
    const all = await MaterialCategoryService.getMaterialCategories(companyId);
    validateHierarchyPatch(all, {
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
    });
    await db.insert(materialCategories).values({
      companyId,
      name: (data.name ?? "").trim(),
      color: data.color || DEFAULT_CATEGORY_COLOR,
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
      sortOrder: data.sortOrder ?? 0,
    } as typeof materialCategories.$inferInsert);
  }

  static async updateMaterialCategory(
    companyId: number,
    id: number,
    data: Partial<typeof materialCategories.$inferInsert>
  ) {
    const all = await MaterialCategoryService.getMaterialCategories(companyId);
    validateHierarchyPatch(all, { parentId: data.parentId, isGroup: data.isGroup }, id);
    const self = all.find((r) => r.id === id);
    if (self?.isGroup && data.isGroup === false) {
      const childCount = await countMaterialCategoryChildren(id);
      if (childCount > 0) throw new CategoryHierarchyError("group_has_children");
    }
    await db
      .update(materialCategories)
      .set(data)
      .where(and(eq(materialCategories.id, id), eq(materialCategories.companyId, companyId)));
  }

  static async deleteMaterialCategory(companyId: number, id: number) {
    const childCount = await countMaterialCategoryChildren(id);
    if (childCount > 0) throw new CategoryHierarchyError("group_has_children");
    await db
      .delete(materialCategories)
      .where(and(eq(materialCategories.id, id), eq(materialCategories.companyId, companyId)));
  }
}

/** Payload aktualizacji kategorii materiałów — bez importu schematu w kontrolerze. */
export type MaterialCategoryUpdateInput = Partial<typeof materialCategories.$inferInsert>;
