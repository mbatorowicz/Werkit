import { db } from "@/db";
import { stockReceipts, stockIssues, spareParts, users, workOrders, resources } from "@/db/schema";
import type { StockReceipt, StockIssue, StockReceiptInput, StockIssueInput } from "@/types/dur";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { WarehouseDb } from "@/services/warehouse/warehouseTypes";
import {
  executeWarehouseIssue,
  executeWarehouseReceipt,
} from "@/services/warehouse/warehouseMovements";
import { sparePartsInventoryStore } from "@/services/warehouse/adapters/sparePartsStore";

const recipientUser = alias(users, "stock_issue_recipient");

/**
 * Serwis ruchów magazynowych (przyjęcia PZ / wydania WZ) — DUR Faza 2.
 */
export class StockMovementService {
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
      .leftJoin(users, eq(stockReceipts.createdBy, users.id))
      .where(eq(stockReceipts.companyId, companyId))
      .orderBy(desc(stockReceipts.createdAt));

    return rows.map((r) => ({
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
    }));
  }

  static async addReceipt(
    companyId: number,
    userId: number,
    input: StockReceiptInput,
    client: WarehouseDb = db
  ): Promise<StockReceipt> {
    return executeWarehouseReceipt({
      store: sparePartsInventoryStore,
      companyId,
      skuId: input.partId,
      quantity: input.quantity,
      client,
      insertReceipt: async () => {
        const [row] = await client
          .insert(stockReceipts)
          .values({
            companyId,
            partId: input.partId,
            quantity: input.quantity,
            unitPrice: input.unitPrice ?? null,
            invoiceNumber: input.invoiceNumber ?? null,
            notes: input.notes ?? null,
            createdBy: userId,
            workOrderSparePartId: input.workOrderSparePartId ?? null,
          })
          .returning();

        return {
          ...row,
          createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        };
      },
    });
  }

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
        issuedToName: recipientUser.fullName,
        resourceName: resources.name,
      })
      .from(stockIssues)
      .innerJoin(spareParts, eq(stockIssues.partId, spareParts.id))
      .leftJoin(users, eq(stockIssues.createdBy, users.id))
      .leftJoin(recipientUser, eq(stockIssues.issuedTo, recipientUser.id))
      .leftJoin(workOrders, eq(stockIssues.workOrderId, workOrders.id))
      .leftJoin(resources, eq(workOrders.resourceId, resources.id))
      .where(eq(stockIssues.companyId, companyId))
      .orderBy(desc(stockIssues.createdAt));

    return rows.map((r) => ({
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
      issuedToName: r.issuedToName ?? undefined,
      resourceName: r.resourceName ?? undefined,
    }));
  }

  static async addIssue(
    companyId: number,
    userId: number,
    input: StockIssueInput,
    client: WarehouseDb = db
  ): Promise<StockIssue> {
    return executeWarehouseIssue({
      store: sparePartsInventoryStore,
      companyId,
      skuId: input.partId,
      quantity: input.quantity,
      client,
      insertIssue: async () => {
        const [row] = await client
          .insert(stockIssues)
          .values({
            companyId,
            partId: input.partId,
            quantity: input.quantity,
            workOrderId: input.workOrderId ?? null,
            issuedTo: input.issuedTo ?? null,
            notes: input.notes ?? null,
            createdBy: userId,
            workOrderSparePartId: input.workOrderSparePartId ?? null,
          })
          .returning();

        return {
          ...row,
          createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        };
      },
    });
  }

  /** Wydanie magazynowe powiązane z pobraniem części na zlecenie. */
  static async issueForWorkOrderLine(
    companyId: number,
    actorUserId: number,
    params: {
      workOrderSparePartId: number;
      workOrderId: number;
      partId: number;
      quantity: string;
      issuedTo: number;
      notes?: string | null;
    },
    client: WarehouseDb = db
  ): Promise<StockIssue> {
    return this.addIssue(
      companyId,
      actorUserId,
      {
        partId: params.partId,
        quantity: params.quantity,
        workOrderId: params.workOrderId,
        issuedTo: params.issuedTo,
        notes: params.notes ?? null,
        workOrderSparePartId: params.workOrderSparePartId,
      },
      client
    );
  }

  /** Zwrot na magazyn po usunięciu części ze zlecenia (niewykorzystana). */
  static async returnForWorkOrderLine(
    companyId: number,
    actorUserId: number,
    params: {
      workOrderSparePartId: number;
      partId: number;
      quantity: string;
      workOrderId: number;
    },
    client: WarehouseDb = db
  ): Promise<StockReceipt> {
    return this.addReceipt(
      companyId,
      actorUserId,
      {
        partId: params.partId,
        quantity: params.quantity,
        unitPrice: null,
        invoiceNumber: null,
        notes: `Zwrot ze zlecenia #${params.workOrderId}`,
        workOrderSparePartId: params.workOrderSparePartId,
      },
      client
    );
  }
}
