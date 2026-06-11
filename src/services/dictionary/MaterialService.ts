import { db } from "@/db";
import { materials, materialToCategories, materialInventory } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { assertMaterialCategoriesAssignable } from "@/services/categoryHierarchyValidation";
import { DEFAULT_MATERIAL_MEASURE_UNIT, normalizeMeasureUnit } from "@/lib/measureUnits";

export class MaterialService {
  static async getMaterials(companyId: number) {
    const all = await db
      .select()
      .from(materials)
      .where(eq(materials.companyId, companyId))
      .orderBy(desc(materials.id));
    const materialIds = new Set(all.map((m) => m.id));
    const links = await db.select().from(materialToCategories);
    const byMaterialId = new Map<number, number[]>();
    for (const l of links) {
      if (!materialIds.has(l.materialId)) continue;
      const arr = byMaterialId.get(l.materialId) ?? [];
      arr.push(l.categoryId);
      byMaterialId.set(l.materialId, arr);
    }

    const inventoryRows = await db
      .select({
        materialId: materialInventory.materialId,
        quantity: materialInventory.quantity,
      })
      .from(materialInventory)
      .where(eq(materialInventory.companyId, companyId));
    const stockByMaterialId = new Map<number, string>();
    for (const row of inventoryRows) {
      stockByMaterialId.set(row.materialId, String(row.quantity ?? "0"));
    }

    return all.map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      categoryIds: byMaterialId.get(m.id) ?? [],
      minStock: m.minStock != null ? String(m.minStock) : null,
      location: m.location ?? null,
      stockQuantity: stockByMaterialId.get(m.id) ?? "0",
    }));
  }

  static async addMaterial(
    companyId: number,
    name: string,
    categoryIds: number[] = [],
    opts?: { unit?: string; minStock?: string | null; location?: string | null }
  ) {
    await assertMaterialCategoriesAssignable(categoryIds, companyId);
    let unit: string = DEFAULT_MATERIAL_MEASURE_UNIT;
    if (opts?.unit !== undefined && opts.unit !== null && String(opts.unit).trim() !== "") {
      const normalized = normalizeMeasureUnit(opts.unit);
      if (!normalized) throw new Error("invalid_unit");
      unit = normalized;
    }
    const res = await db
      .insert(materials)
      .values({
        name,
        companyId,
        unit,
        minStock: opts?.minStock ?? null,
        location: opts?.location ?? null,
      })
      .returning();
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
    const patch = { ...data };
    if (patch.unit !== undefined && patch.unit !== null) {
      const normalized = normalizeMeasureUnit(patch.unit);
      if (!normalized) throw new Error("invalid_unit");
      patch.unit = normalized;
    }
    await db
      .update(materials)
      .set(patch)
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
