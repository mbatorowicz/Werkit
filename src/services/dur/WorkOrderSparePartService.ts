// ============================================================
// Werkit — Serwis: części zamienne przypisane do zlecenia naprawy
// ============================================================

import { db } from "@/db";
import { workOrderSpareParts, spareParts, workOrders } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export class WorkOrderSparePartService {
  /**
   * Weryfikuje, czy zlecenie o podanym ID należy do firmy.
   * Używane przez handlery API do walidacji dostępu do zlecenia.
   */
  static async verifyOrderBelongsToCompany(
    workOrderId: number,
    companyId: number
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(and(eq(workOrders.id, workOrderId), eq(workOrders.companyId, companyId)))
      .limit(1);

    return !!row;
  }

  /**
   * Pobiera wszystkie części przypisane do danego zlecenia.
   */
  static async getPartsForOrder(workOrderId: number) {
    const rows = await db
      .select({
        id: workOrderSpareParts.id,
        workOrderId: workOrderSpareParts.workOrderId,
        partId: workOrderSpareParts.partId,
        partName: spareParts.name,
        partSku: spareParts.catalogNumber,
        quantity: workOrderSpareParts.quantity,
        unitPrice: workOrderSpareParts.unitPrice,
        notes: workOrderSpareParts.notes,
      })
      .from(workOrderSpareParts)
      .innerJoin(spareParts, eq(workOrderSpareParts.partId, spareParts.id))
      .where(eq(workOrderSpareParts.workOrderId, workOrderId))
      .orderBy(desc(workOrderSpareParts.id));

    return rows;
  }

  /**
   * Dodaje część do zlecenia naprawy.
   */
  static async addPartToOrder(
    workOrderId: number,
    data: {
      partId: number;
      quantity?: string;
      unitPrice?: string | null;
      notes?: string | null;
    }
  ) {
    const [inserted] = await db
      .insert(workOrderSpareParts)
      .values({
        workOrderId,
        partId: data.partId,
        quantity: data.quantity ?? "1",
        unitPrice: data.unitPrice ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    return inserted;
  }

  /**
   * Aktualizuje ilość / cenę / notatki części w zleceniu.
   */
  static async updatePartInOrder(
    id: number,
    data: {
      quantity?: string;
      unitPrice?: string | null;
      notes?: string | null;
    }
  ) {
    const [updated] = await db
      .update(workOrderSpareParts)
      .set({
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      })
      .where(eq(workOrderSpareParts.id, id))
      .returning();

    return updated;
  }

  /**
   * Usuwa część ze zlecenia naprawy.
   */
  static async removePartFromOrder(id: number) {
    const [deleted] = await db
      .delete(workOrderSpareParts)
      .where(eq(workOrderSpareParts.id, id))
      .returning();

    return deleted;
  }

  /**
   * Sprawdza, czy dana część należy do zlecenia.
   */
  static async assertPartBelongsToOrder(partId: number, workOrderId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: workOrderSpareParts.id })
      .from(workOrderSpareParts)
      .where(
        and(eq(workOrderSpareParts.id, partId), eq(workOrderSpareParts.workOrderId, workOrderId))
      )
      .limit(1);

    return !!row;
  }
}
