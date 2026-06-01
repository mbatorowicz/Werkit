import { db } from "@/db";
import { spareParts, sparePartToCategories, sparePartMachineCompatibility } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { assertSparePartCategoriesAssignable } from "@/services/dur/categoryValidation";

export class SparePartService {
  static async getParts(companyId: number) {
    const all = await db
      .select()
      .from(spareParts)
      .where(eq(spareParts.companyId, companyId))
      .orderBy(desc(spareParts.id));

    // Pobierz linki N:M — kategorie części
    const categoryLinks = await db.select().from(sparePartToCategories);
    const byPartId = new Map<number, number[]>();
    for (const l of categoryLinks) {
      const arr = byPartId.get(l.partId) ?? [];
      arr.push(l.categoryId);
      byPartId.set(l.partId, arr);
    }

    // Pobierz linki N:M — kompatybilność z kategoriami maszyn
    const machineLinks = await db.select().from(sparePartMachineCompatibility);
    const byPartIdMachine = new Map<number, number[]>();
    for (const l of machineLinks) {
      const arr = byPartIdMachine.get(l.partId) ?? [];
      arr.push(l.categoryId);
      byPartIdMachine.set(l.partId, arr);
    }

    return all.map((p) => ({
      ...p,
      categoryIds: byPartId.get(p.id) ?? [],
      machineCategoryIds: byPartIdMachine.get(p.id) ?? [],
    }));
  }

  static async getPart(companyId: number, id: number) {
    const [part] = await db
      .select()
      .from(spareParts)
      .where(and(eq(spareParts.id, id), eq(spareParts.companyId, companyId)))
      .limit(1);

    if (!part) return null;

    const categoryLinks = await db
      .select()
      .from(sparePartToCategories)
      .where(eq(sparePartToCategories.partId, id));

    const machineLinks = await db
      .select()
      .from(sparePartMachineCompatibility)
      .where(eq(sparePartMachineCompatibility.partId, id));

    return {
      ...part,
      categoryIds: categoryLinks.map((l) => l.categoryId),
      machineCategoryIds: machineLinks.map((l) => l.categoryId),
    };
  }

  static async addPart(
    companyId: number,
    data: {
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
    }
  ) {
    const catIds = data.categoryIds ?? [];
    const machIds = data.machineCategoryIds ?? [];

    if (catIds.length > 0) {
      await assertSparePartCategoriesAssignable(catIds, companyId);
    }

    const res = await db
      .insert(spareParts)
      .values({
        companyId,
        name: data.name.trim(),
        catalogNumber: data.catalogNumber ?? "",
        manufacturer: data.manufacturer ?? "",
        unit: data.unit ?? "szt",
        purchasePrice: data.purchasePrice ?? null,
        description: data.description ?? null,
        minStock: data.minStock ?? "0",
        location: data.location ?? "",
        imageUrl: data.imageUrl ?? null,
        isActive: data.isActive ?? true,
      })
      .returning();

    const partId = res[0].id;

    if (catIds.length > 0) {
      await db
        .insert(sparePartToCategories)
        .values(catIds.map((cid) => ({ partId, categoryId: cid })));
    }

    if (machIds.length > 0) {
      await db
        .insert(sparePartMachineCompatibility)
        .values(machIds.map((cid) => ({ partId, categoryId: cid })));
    }

    return partId;
  }

  static async updatePart(
    companyId: number,
    id: number,
    data: {
      name?: string;
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
    }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.catalogNumber !== undefined) updateData.catalogNumber = data.catalogNumber;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.minStock !== undefined) updateData.minStock = data.minStock;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(spareParts)
        .set(updateData)
        .where(and(eq(spareParts.id, id), eq(spareParts.companyId, companyId)));
    }

    // Aktualizacja kategorii części
    if (data.categoryIds !== undefined) {
      const catIds = data.categoryIds;
      if (catIds.length > 0) {
        await assertSparePartCategoriesAssignable(catIds, companyId);
      }
      await db.delete(sparePartToCategories).where(eq(sparePartToCategories.partId, id));
      if (catIds.length > 0) {
        await db
          .insert(sparePartToCategories)
          .values(catIds.map((cid) => ({ partId: id, categoryId: cid })));
      }
    }

    // Aktualizacja kompatybilności z kategoriami maszyn
    if (data.machineCategoryIds !== undefined) {
      const machIds = data.machineCategoryIds;
      await db
        .delete(sparePartMachineCompatibility)
        .where(eq(sparePartMachineCompatibility.partId, id));
      if (machIds.length > 0) {
        await db
          .insert(sparePartMachineCompatibility)
          .values(machIds.map((cid) => ({ partId: id, categoryId: cid })));
      }
    }
  }

  static async deletePart(companyId: number, id: number) {
    await db
      .delete(spareParts)
      .where(and(eq(spareParts.id, id), eq(spareParts.companyId, companyId)));
  }
}
