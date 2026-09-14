import { db } from "@/db";
import { sparePartInventory, spareParts } from "@/db/schema";
import type { SparePartInventory } from "@/types/dur";
import { eq, and } from "drizzle-orm";
import type { WarehouseDb } from "@/services/warehouse/warehouseTypes";
import { executeWarehouseAdjustment } from "@/services/warehouse/warehouseMovements";
import { sparePartsInventoryStore } from "@/services/warehouse/adapters/sparePartsStore";

/**
 * Serwis stanów magazynowych części zamiennych.
 * Odczyt z JOIN katalogu; mutacje stanu przez jądro `services/warehouse`.
 */
export class InventoryService {
  /**
   * Pobiera stan magazynowy dla firmy, opcjonalnie filtrując po partId.
   */
  static async getInventory(
    companyId: number,
    opts?: { partId?: number }
  ): Promise<SparePartInventory[]> {
    const conditions = [eq(sparePartInventory.companyId, companyId)];
    if (opts?.partId) {
      conditions.push(eq(sparePartInventory.partId, opts.partId));
    }

    const rows = await db
      .select({
        id: sparePartInventory.id,
        companyId: sparePartInventory.companyId,
        partId: sparePartInventory.partId,
        quantity: sparePartInventory.quantity,
        updatedAt: sparePartInventory.updatedAt,
        partName: spareParts.name,
        partCatalogNumber: spareParts.catalogNumber,
        partUnit: spareParts.unit,
      })
      .from(sparePartInventory)
      .innerJoin(spareParts, eq(sparePartInventory.partId, spareParts.id))
      .where(and(...conditions))
      .orderBy(spareParts.name);

    return rows.map((r) => ({
      ...r,
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
    }));
  }

  /**
   * Pobiera stan pojedynczej części.
   */
  static async getPartInventory(
    companyId: number,
    partId: number
  ): Promise<SparePartInventory | null> {
    const rows = await this.getInventory(companyId, { partId });
    return rows[0] ?? null;
  }

  /**
   * Aktualizuje (zastępuje) ilość dla danego partId w ramach firmy.
   * Jeśli wiersz nie istnieje — tworzy go.
   * Używane przez StockMovementService przy przyjęciach/wydaniach.
   */
  static async upsertQuantity(
    companyId: number,
    partId: number,
    delta: string,
    client: WarehouseDb = db
  ): Promise<void> {
    await sparePartsInventoryStore.applyDelta(companyId, partId, delta, client);
  }

  /**
   * Ustawia bezwzględną ilość (korekta ręczna).
   */
  static async setQuantity(
    companyId: number,
    partId: number,
    quantity: string,
    client: WarehouseDb = db
  ): Promise<void> {
    await executeWarehouseAdjustment({
      store: sparePartsInventoryStore,
      companyId,
      skuId: partId,
      quantity,
      client,
    });
  }
}
