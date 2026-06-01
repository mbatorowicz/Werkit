import { db } from "@/db";
import { stockReceipts, stockIssues, spareParts, users, workOrders } from "@/db/schema";
import type { StockReceipt, StockIssue, StockReceiptInput, StockIssueInput } from "@/types/dur";
import { InventoryService } from "./InventoryService";
import { eq, desc } from "drizzle-orm";

/**
 * Serwis ruchów magazynowych (przyjęcia PZ / wydania WZ) — DUR Faza 2.
 * Każda operacja aktualizuje też stan magazynowy (InventoryService).
 */
export class StockMovementService {
  // ── Przyjęcia ──

  /**
   * Lista przyjęć dla firmy.
   */
  static async getReceipts(companyId: number): Promise<StockReceipt[]> {
    const rows = await db
      .select({
        id: stockReceipts.id,
        companyId: stockReceipts.companyId,
        partId: stockReceipts.partId,
        quantity: stockReceipts.quantity,
        unitPrice: stockReceipts.unitPrice,
        invoiceNumber: stockReceipts.invoiceNumber,
        notes: stockReceipts.notes,
        createdBy: stockReceipts.createdBy,
        createdAt: stockReceipts.createdAt,
        partName: spareParts.name,
        partCatalogNumber: spareParts.catalogNumber,
        creatorName: users.fullName,
      })
      .from(stockReceipts)
      .innerJoin(spareParts, eq(stockReceipts.partId, spareParts.id))
      .innerJoin(users, eq(stockReceipts.createdBy, users.id))
      .where(eq(stockReceipts.companyId, companyId))
      .orderBy(desc(stockReceipts.createdAt));

    return rows.map((r) => {
      const base: StockReceipt = {
        id: r.id,
        companyId: r.companyId,
        partId: r.partId,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        invoiceNumber: r.invoiceNumber,
        notes: r.notes,
        createdBy: r.createdBy,
        createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
        partName: r.partName ?? undefined,
        partCatalogNumber: r.partCatalogNumber ?? undefined,
        creatorName: r.creatorName ?? undefined,
      };
      return base;
    });
  }

  /**
   * Dodaje przyjęcie i aktualizuje stan magazynowy (+quantity).
   */
  static async addReceipt(
    companyId: number,
    userId: number,
    input: StockReceiptInput
  ): Promise<StockReceipt> {
    const [row] = await db
      .insert(stockReceipts)
      .values({
        companyId,
        partId: input.partId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    // Aktualizacja stanu magazynowego (+quantity)
    await InventoryService.upsertQuantity(companyId, input.partId, input.quantity);

    return {
      ...row,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    };
  }

  // ── Wydania ──

  /**
   * Lista wydań dla firmy.
   */
  static async getIssues(companyId: number): Promise<StockIssue[]> {
    const rows = await db
      .select({
        id: stockIssues.id,
        companyId: stockIssues.companyId,
        partId: stockIssues.partId,
        quantity: stockIssues.quantity,
        workOrderId: stockIssues.workOrderId,
        issuedTo: stockIssues.issuedTo,
        notes: stockIssues.notes,
        createdBy: stockIssues.createdBy,
        createdAt: stockIssues.createdAt,
        partName: spareParts.name,
        partCatalogNumber: spareParts.catalogNumber,
        creatorName: users.fullName,
        workOrderLabel: workOrders.taskDescription,
      })
      .from(stockIssues)
      .innerJoin(spareParts, eq(stockIssues.partId, spareParts.id))
      .innerJoin(users, eq(stockIssues.createdBy, users.id))
      .leftJoin(workOrders, eq(stockIssues.workOrderId, workOrders.id))
      .where(eq(stockIssues.companyId, companyId))
      .orderBy(desc(stockIssues.createdAt));

    return rows.map((r) => {
      const base: StockIssue = {
        id: r.id,
        companyId: r.companyId,
        partId: r.partId,
        quantity: r.quantity,
        workOrderId: r.workOrderId,
        issuedTo: r.issuedTo,
        notes: r.notes,
        createdBy: r.createdBy,
        createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
        partName: r.partName ?? undefined,
        partCatalogNumber: r.partCatalogNumber ?? undefined,
        creatorName: r.creatorName ?? undefined,
        workOrderLabel: r.workOrderLabel ?? undefined,
      };
      return base;
    });
  }

  /**
   * Dodaje wydanie i aktualizuje stan magazynowy (-quantity).
   */
  static async addIssue(
    companyId: number,
    userId: number,
    input: StockIssueInput
  ): Promise<StockIssue> {
    // Walidacja: quantity musi być dodatnia
    const qty = input.quantity;
    if (parseFloat(qty) <= 0) {
      throw new Error("Ilość wydania musi być dodatnia");
    }

    // Sprawdzenie stanu magazynowego
    const inventory = await InventoryService.getPartInventory(companyId, input.partId);
    const currentQty = inventory ? parseFloat(inventory.quantity) : 0;
    if (currentQty < parseFloat(qty)) {
      throw new Error("Niewystarczający stan magazynowy");
    }

    const [row] = await db
      .insert(stockIssues)
      .values({
        companyId,
        partId: input.partId,
        quantity: input.quantity,
        workOrderId: input.workOrderId ?? null,
        issuedTo: input.issuedTo ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    // Aktualizacja stanu magazynowego (-quantity)
    await InventoryService.upsertQuantity(companyId, input.partId, `-${qty}`);

    return {
      ...row,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    };
  }
}
