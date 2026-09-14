import { db } from "@/db";
import { materialInventory, materials } from "@/db/schema";
import type { MaterialInventoryRow } from "@/types/materials-warehouse";
import { eq, and } from "drizzle-orm";
import type { WarehouseDb } from "@/services/warehouse/warehouseTypes";
import { executeWarehouseAdjustment } from "@/services/warehouse/warehouseMovements";
import { materialsInventoryStore } from "@/services/warehouse/adapters/materialsStore";

export class MaterialInventoryService {
  static async getInventory(
    companyId: number,
    opts?: { materialId?: number }
  ): Promise<MaterialInventoryRow[]> {
    const conditions = [eq(materialInventory.companyId, companyId)];
    if (opts?.materialId) {
      conditions.push(eq(materialInventory.materialId, opts.materialId));
    }

    const rows = await db
      .select({
        id: materialInventory.id,
        companyId: materialInventory.companyId,
        materialId: materialInventory.materialId,
        quantity: materialInventory.quantity,
        updatedAt: materialInventory.updatedAt,
        materialName: materials.name,
      })
      .from(materialInventory)
      .innerJoin(materials, eq(materialInventory.materialId, materials.id))
      .where(and(...conditions))
      .orderBy(materials.name);

    return rows.map((r) => ({
      ...r,
      quantity: String(r.quantity ?? "0"),
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
    }));
  }

  static async upsertQuantity(
    companyId: number,
    materialId: number,
    delta: string,
    client: WarehouseDb = db
  ): Promise<void> {
    await materialsInventoryStore.applyDelta(companyId, materialId, delta, client);
  }

  static async setQuantity(
    companyId: number,
    materialId: number,
    quantity: string,
    client: WarehouseDb = db
  ): Promise<void> {
    await executeWarehouseAdjustment({
      store: materialsInventoryStore,
      companyId,
      skuId: materialId,
      quantity,
      client,
    });
  }
}
