import { db } from "@/db";
import {
  stockReceipts,
  stockIssues,
  sparePartInventory,
  spareParts,
  users,
  workOrders,
  resources,
} from "@/db/schema";
import type { StockReceipt, StockIssue, StockReceiptInput, StockIssueInput } from "@/types/dur";
import { InventoryService } from "./InventoryService";
import { StockMovementError } from "./StockMovementError";
import { eq, and, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const recipientUser = alias(users, "stock_issue_recipient");
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import { parseDecimalInput } from "@/lib/decimalInput";

type DbClient = NodePgDatabase<typeof schema>;

function assertPositiveQuantity(quantity: string) {
  const n = parseDecimalInput(quantity);
  if (n == null || n <= 0) {
    throw new StockMovementError("invalid_quantity");
  }
}

async function assertSufficientStock(
  companyId: number,
  partId: number,
  quantity: string,
  client: DbClient = db
) {
  const [row] = await client
    .select({ quantity: sparePartInventory.quantity })
    .from(sparePartInventory)
    .where(
      and(
        eq(sparePartInventory.companyId, companyId),
        eq(sparePartInventory.partId, partId)
      )
    )
    .limit(1);
  const currentQty = row ? (parseDecimalInput(row.quantity) ?? 0) : 0;
  if (currentQty < (parseDecimalInput(quantity) ?? 0)) {
    throw new StockMovementError("insufficient_stock");
  }
}

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
    client: DbClient = db
  ): Promise<StockReceipt> {
    assertPositiveQuantity(input.quantity);

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

    await InventoryService.upsertQuantity(companyId, input.partId, input.quantity, client);

    return {
      ...row,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    };
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
    client: DbClient = db
  ): Promise<StockIssue> {
    assertPositiveQuantity(input.quantity);
    await assertSufficientStock(companyId, input.partId, input.quantity, client);

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

    await InventoryService.upsertQuantity(companyId, input.partId, `-${input.quantity}`, client);

    return {
      ...row,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    };
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
    client: DbClient = db
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
    client: DbClient = db
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
