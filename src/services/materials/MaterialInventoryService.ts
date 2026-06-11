import { db } from "@/db";
import { materialInventory, materials } from "@/db/schema";
import type { MaterialInventoryRow } from "@/types/materials-warehouse";
import { eq, and, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";

type DbClient = NodePgDatabase<typeof schema>;

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
    client: DbClient = db
  ): Promise<void> {
    await client
      .insert(materialInventory)
      .values({
        companyId,
        materialId,
        quantity: delta,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [materialInventory.companyId, materialInventory.materialId],
        set: {
          quantity: sql`CAST(${materialInventory.quantity} AS numeric) + CAST(${delta} AS numeric)`,
          updatedAt: new Date(),
        },
      });
  }

  static async setQuantity(companyId: number, materialId: number, quantity: string): Promise<void> {
    await db
      .insert(materialInventory)
      .values({
        companyId,
        materialId,
        quantity,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [materialInventory.companyId, materialInventory.materialId],
        set: {
          quantity,
          updatedAt: new Date(),
        },
      });
  }
}
