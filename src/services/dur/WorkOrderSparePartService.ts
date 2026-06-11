// ============================================================
// Werkit — Serwis: części zamienne przypisane do zlecenia naprawy
// ============================================================

import { db } from "@/db";
import { workOrderSpareParts, spareParts, workOrders, workSessions, stockIssues } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { parseDecimalInput } from "@/lib/decimalInput";
import { StockMovementService } from "@/services/dur/StockMovementService";
import { StockMovementError } from "@/services/dur/StockMovementError";

export class WorkOrderSparePartService {
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

  static async assertPartBelongsToCompany(partId: number, companyId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: spareParts.id })
      .from(spareParts)
      .where(and(eq(spareParts.id, partId), eq(spareParts.companyId, companyId)))
      .limit(1);

    return !!row;
  }

  static async verifyWorkerHasActiveOrderSession(
    workOrderId: number,
    userId: number,
    companyId: number
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: workSessions.id })
      .from(workSessions)
      .where(
        and(
          eq(workSessions.workOrderId, workOrderId),
          eq(workSessions.userId, userId),
          eq(workSessions.companyId, companyId),
          eq(workSessions.status, "IN_PROGRESS")
        )
      )
      .limit(1);

    return !!row;
  }

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
   * Pobranie części z magazynu na zlecenie: wpis na zleceniu + automatyczne WZ (−stan).
   */
  static async pickPartFromWarehouse(
    companyId: number,
    actorUserId: number,
    workOrderId: number,
    data: {
      partId: number;
      quantity?: string;
      unitPrice?: string | null;
      notes?: string | null;
      /** Komu wydano (domyślnie actorUserId). */
      issuedTo?: number;
    }
  ) {
    const quantity = data.quantity ?? "1";
    const issuedTo = data.issuedTo ?? actorUserId;

    const partOk = await this.assertPartBelongsToCompany(data.partId, companyId);
    if (!partOk) throw new StockMovementError("part_not_found");

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(workOrderSpareParts)
        .values({
          workOrderId,
          partId: data.partId,
          quantity,
          unitPrice: data.unitPrice ?? null,
          notes: data.notes ?? null,
        })
        .returning();

      await StockMovementService.issueForWorkOrderLine(
        companyId,
        actorUserId,
        {
          workOrderSparePartId: inserted.id,
          workOrderId,
          partId: data.partId,
          quantity,
          issuedTo,
          notes: data.notes ?? null,
        },
        tx
      );

      return inserted;
    });
  }

  /**
   * Zwrot części do magazynu (usunięcie z zlecenia): PZ (+stan) + usunięcie wpisu.
   */
  static async returnPartToWarehouse(
    companyId: number,
    actorUserId: number,
    lineId: number,
    workOrderId: number
  ) {
    const [line] = await db
      .select()
      .from(workOrderSpareParts)
      .where(
        and(eq(workOrderSpareParts.id, lineId), eq(workOrderSpareParts.workOrderId, workOrderId))
      )
      .limit(1);

    if (!line) return null;

    const partOk = await this.assertPartBelongsToCompany(line.partId, companyId);
    if (!partOk) throw new StockMovementError("part_not_found");

    return db.transaction(async (tx) => {
      await StockMovementService.returnForWorkOrderLine(
        companyId,
        actorUserId,
        {
          workOrderSparePartId: line.id,
          partId: line.partId,
          quantity: line.quantity,
          workOrderId,
        },
        tx
      );

      const [deleted] = await tx
        .delete(workOrderSpareParts)
        .where(eq(workOrderSpareParts.id, lineId))
        .returning();

      return deleted;
    });
  }

  /**
   * Korekta ilości na zleceniu — dopasowanie stanu magazynowego (delta).
   */
  static async updatePartInOrderWithStock(
    companyId: number,
    actorUserId: number,
    lineId: number,
    workOrderId: number,
    data: {
      quantity?: string;
      unitPrice?: string | null;
      notes?: string | null;
    }
  ) {
    const [line] = await db
      .select()
      .from(workOrderSpareParts)
      .where(
        and(eq(workOrderSpareParts.id, lineId), eq(workOrderSpareParts.workOrderId, workOrderId))
      )
      .limit(1);

    if (!line) return null;

    const newQty = data.quantity ?? line.quantity;
    const oldQty = parseDecimalInput(line.quantity) ?? 0;
    const nextQty = parseDecimalInput(newQty) ?? Number.NaN;
    const delta = nextQty - oldQty;

    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      throw new StockMovementError("invalid_quantity");
    }

    return db.transaction(async (tx) => {
      if (Math.abs(delta) > 0.0001) {
        if (delta > 0) {
          await StockMovementService.addIssue(
            companyId,
            actorUserId,
            {
              partId: line.partId,
              quantity: String(delta),
              workOrderId,
              issuedTo: actorUserId,
              notes: `Korekta ilości na zleceniu #${workOrderId}`,
              workOrderSparePartId: null,
            },
            tx
          );
        } else {
          await StockMovementService.addReceipt(
            companyId,
            actorUserId,
            {
              partId: line.partId,
              quantity: String(Math.abs(delta)),
              notes: `Korekta ilości na zleceniu #${workOrderId}`,
              workOrderSparePartId: null,
            },
            tx
          );
        }

        const [linkedIssue] = await tx
          .select({ id: stockIssues.id, quantity: stockIssues.quantity })
          .from(stockIssues)
          .where(eq(stockIssues.workOrderSparePartId, lineId))
          .limit(1);

        if (linkedIssue) {
          await tx
            .update(stockIssues)
            .set({ quantity: newQty })
            .where(eq(stockIssues.id, linkedIssue.id));
        }
      }

      const [updated] = await tx
        .update(workOrderSpareParts)
        .set({
          ...(data.quantity !== undefined ? { quantity: newQty } : {}),
          ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        })
        .where(eq(workOrderSpareParts.id, lineId))
        .returning();

      return updated;
    });
  }

  /** @deprecated Użyj pickPartFromWarehouse — zostawione dla testów mocków. */
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

  /** @deprecated Użyj returnPartToWarehouse */
  static async removePartFromOrder(id: number) {
    const [deleted] = await db
      .delete(workOrderSpareParts)
      .where(eq(workOrderSpareParts.id, id))
      .returning();

    return deleted;
  }

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
