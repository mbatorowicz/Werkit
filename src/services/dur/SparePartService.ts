import { db } from "@/db";
import {
  DEFAULT_SPARE_PART_MEASURE_UNIT,
  normalizeMeasureUnit,
} from "@/lib/measureUnits";
import {
  spareParts,
  sparePartToCategories,
  sparePartMachineCompatibility,
  sparePartInventory,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  assertSparePartCategoriesAssignable,
  assertResourceGroupsAssignable,
} from "@/services/dur/categoryValidation";

export class SparePartService {
  static async getParts(companyId: number, opts?: { compatibleWithResourceGroupId?: number }) {
    const all = await db
      .select()
      .from(spareParts)
      .where(eq(spareParts.companyId, companyId))
      .orderBy(desc(spareParts.id));

    const categoryLinks = await db.select().from(sparePartToCategories);
    const byPartId = new Map<number, number[]>();
    for (const l of categoryLinks) {
      const arr = byPartId.get(l.partId) ?? [];
      arr.push(l.categoryId);
      byPartId.set(l.partId, arr);
    }

    const machineLinks = await db.select().from(sparePartMachineCompatibility);
    const byPartIdGroup = new Map<number, number[]>();
    for (const l of machineLinks) {
      const arr = byPartIdGroup.get(l.partId) ?? [];
      arr.push(l.resourceGroupId);
      byPartIdGroup.set(l.partId, arr);
    }

    const inventoryRows = await db
      .select({
        partId: sparePartInventory.partId,
        quantity: sparePartInventory.quantity,
      })
      .from(sparePartInventory)
      .where(eq(sparePartInventory.companyId, companyId));
    const stockByPartId = new Map<number, string>();
    for (const row of inventoryRows) {
      stockByPartId.set(row.partId, String(row.quantity ?? "0"));
    }

    const mapped = all.map((p) => ({
      ...p,
      categoryIds: byPartId.get(p.id) ?? [],
      resourceGroupIds: byPartIdGroup.get(p.id) ?? [],
      /** @deprecated alias — użyj resourceGroupIds */
      machineCategoryIds: byPartIdGroup.get(p.id) ?? [],
      stockQuantity: stockByPartId.get(p.id) ?? "0",
    }));

    if (opts?.compatibleWithResourceGroupId != null) {
      const groupId = opts.compatibleWithResourceGroupId;
      return mapped.filter((p) => p.resourceGroupIds.includes(groupId));
    }

    return mapped;
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

    const resourceGroupIds = machineLinks.map((l) => l.resourceGroupId);

    return {
      ...part,
      categoryIds: categoryLinks.map((l) => l.categoryId),
      resourceGroupIds,
      machineCategoryIds: resourceGroupIds,
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
      resourceGroupIds?: number[];
      machineCategoryIds?: number[];
    }
  ) {
    const catIds = data.categoryIds ?? [];
    const groupIds = data.resourceGroupIds ?? data.machineCategoryIds ?? [];

    if (catIds.length > 0) {
      await assertSparePartCategoriesAssignable(catIds, companyId);
    }

    if (groupIds.length > 0) {
      await assertResourceGroupsAssignable(groupIds, companyId);
    }

    let unit: string = DEFAULT_SPARE_PART_MEASURE_UNIT;
    if (data.unit !== undefined && data.unit !== null && String(data.unit).trim() !== "") {
      const normalized = normalizeMeasureUnit(data.unit);
      if (!normalized) throw new Error("invalid_unit");
      unit = normalized;
    }

    const res = await db
      .insert(spareParts)
      .values({
        companyId,
        name: data.name.trim(),
        catalogNumber: data.catalogNumber ?? "",
        manufacturer: data.manufacturer ?? "",
        unit,
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

    if (groupIds.length > 0) {
      await db
        .insert(sparePartMachineCompatibility)
        .values(groupIds.map((gid) => ({ partId, resourceGroupId: gid })));
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
      resourceGroupIds?: number[];
      machineCategoryIds?: number[];
    }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.catalogNumber !== undefined) updateData.catalogNumber = data.catalogNumber;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.unit !== undefined) {
      const normalized = normalizeMeasureUnit(data.unit);
      if (!normalized) throw new Error("invalid_unit");
      updateData.unit = normalized;
    }
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

    const groupIds = data.resourceGroupIds ?? data.machineCategoryIds;
    if (groupIds !== undefined) {
      if (groupIds.length > 0) {
        await assertResourceGroupsAssignable(groupIds, companyId);
      }
      await db
        .delete(sparePartMachineCompatibility)
        .where(eq(sparePartMachineCompatibility.partId, id));
      if (groupIds.length > 0) {
        await db
          .insert(sparePartMachineCompatibility)
          .values(groupIds.map((gid) => ({ partId: id, resourceGroupId: gid })));
      }
    }
  }

  static async deletePart(companyId: number, id: number) {
    await db
      .delete(spareParts)
      .where(and(eq(spareParts.id, id), eq(spareParts.companyId, companyId)));
  }
}
