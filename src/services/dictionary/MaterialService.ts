import { db } from "@/db";
import { materials, materialToCategories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { assertMaterialCategoriesAssignable } from "@/services/categoryHierarchyValidation";

export class MaterialService {
  static async getMaterials(companyId: number) {
    const all = await db
      .select()
      .from(materials)
      .where(eq(materials.companyId, companyId))
      .orderBy(desc(materials.id));
    const links = await db.select().from(materialToCategories);
    const byMaterialId = new Map<number, number[]>();
    for (const l of links) {
      const arr = byMaterialId.get(l.materialId) ?? [];
      arr.push(l.categoryId);
      byMaterialId.set(l.materialId, arr);
    }
    return all.map((m) => ({
      id: m.id,
      name: m.name,
      categoryIds: byMaterialId.get(m.id) ?? [],
    }));
  }

  static async addMaterial(companyId: number, name: string, categoryIds: number[] = []) {
    await assertMaterialCategoriesAssignable(categoryIds, companyId);
    const res = await db.insert(materials).values({ name, companyId }).returning();
    const mid = res[0].id;
    if (categoryIds.length > 0) {
      await db
        .insert(materialToCategories)
        .values(categoryIds.map((cid) => ({ materialId: mid, categoryId: cid })));
    }
  }

  static async updateMaterial(
    companyId: number,
    id: number,
    data: Partial<typeof materials.$inferInsert>,
    categoryIds?: number[]
  ) {
    await db
      .update(materials)
      .set(data)
      .where(and(eq(materials.id, id), eq(materials.companyId, companyId)));
    if (categoryIds !== undefined) {
      await assertMaterialCategoriesAssignable(categoryIds, companyId);
      await db.delete(materialToCategories).where(eq(materialToCategories.materialId, id));
      if (categoryIds.length > 0) {
        await db
          .insert(materialToCategories)
          .values(categoryIds.map((cid) => ({ materialId: id, categoryId: cid })));
      }
    }
  }

  static async deleteMaterial(companyId: number, id: number) {
    await db.delete(materials).where(and(eq(materials.id, id), eq(materials.companyId, companyId)));
  }
}
