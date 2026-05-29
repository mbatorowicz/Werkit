import { db } from "@/db";
import { sparePartInventory, spareParts } from "@/db/schema";
import type { SparePartInventory } from "@/types/dur";
import { eq, and, sql } from "drizzle-orm";

/**
 * Serwis stanów magazynowych części zamiennych (DUR Faza 2).
 * Odczyt i korekta stanów — przyjęcia/wydania realizuje StockMovementService.
 */
export class InventoryService {
  /**
   * Pobiera stan magazynowy dla firmy, opcjonalnie filtrując po partId.
   */
  static async getInventory(
    companyId: number,
    opts?: { partId?: number },
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
    partId: number,
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
  ): Promise<void> {
    await db
      .insert(sparePartInventory)
      .values({
        companyId,
        partId,
        quantity: delta,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [sparePartInventory.companyId, sparePartInventory.partId],
        set: {
          quantity: sql`CAST(${sparePartInventory.quantity} AS numeric) + CAST(${delta} AS numeric)`,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Ustawia bezwzględną ilość (korekta ręczna).
   */
  static async setQuantity(
    companyId: number,
    partId: number,
    quantity: string,
  ): Promise<void> {
    await db
      .insert(sparePartInventory)
      .values({
        companyId,
        partId,
        quantity,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [sparePartInventory.companyId, sparePartInventory.partId],
        set: {
          quantity,
          updatedAt: new Date(),
        },
      });
  }
}
