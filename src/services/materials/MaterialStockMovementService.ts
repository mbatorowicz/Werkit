import { db } from "@/db";
import {
  materialStockReceipts,
  materialStockIssues,
  materialInventory,
  materials,
  users,
  workOrders,
} from "@/db/schema";
import type {
  MaterialStockReceipt,
  MaterialStockIssue,
  MaterialStockReceiptInput,
  MaterialStockIssueInput,
} from "@/types/materials-warehouse";
import { MaterialInventoryService } from "./MaterialInventoryService";
import { MaterialStockMovementError } from "./MaterialStockMovementError";
import { eq, and, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import { parseDecimalInput } from "@/lib/decimalInput";

type DbClient = NodePgDatabase<typeof schema>;

function assertPositiveQuantity(quantity: string) {
  const n = parseDecimalInput(quantity);
  if (n == null || n <= 0) {
    throw new MaterialStockMovementError("invalid_quantity");
  }
}

async function assertSufficientStock(
  companyId: number,
  materialId: number,
  quantity: string,
  client: DbClient = db
) {
  const [row] = await client
    .select({ quantity: materialInventory.quantity })
    .from(materialInventory)
    .where(
      and(
        eq(materialInventory.companyId, companyId),
        eq(materialInventory.materialId, materialId)
      )
    )
    .limit(1);
  const currentQty = row ? (parseDecimalInput(String(row.quantity)) ?? 0) : 0;
  if (currentQty < (parseDecimalInput(quantity) ?? 0)) {
    throw new MaterialStockMovementError("insufficient_stock");
  }
}

export class MaterialStockMovementService {
  static async getReceipts(companyId: number): Promise<MaterialStockReceipt[]> {
    const rows = await db
      .select({
        id: materialStockReceipts.id,
        companyId: materialStockReceipts.companyId,
        materialId: materialStockReceipts.materialId,
        quantity: materialStockReceipts.quantity,
        unitPrice: materialStockReceipts.unitPrice,
        invoiceNumber: materialStockReceipts.invoiceNumber,
        notes: materialStockReceipts.notes,
        createdBy: materialStockReceipts.createdBy,
        createdAt: materialStockReceipts.createdAt,
        workSessionId: materialStockReceipts.workSessionId,
        materialName: materials.name,
        creatorName: users.fullName,
      })
      .from(materialStockReceipts)
      .innerJoin(materials, eq(materialStockReceipts.materialId, materials.id))
      .leftJoin(users, eq(materialStockReceipts.createdBy, users.id))
      .where(eq(materialStockReceipts.companyId, companyId))
      .orderBy(desc(materialStockReceipts.createdAt));

    return rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      materialId: r.materialId,
      quantity: String(r.quantity),
      unitPrice: r.unitPrice != null ? String(r.unitPrice) : null,
      invoiceNumber: r.invoiceNumber,
      notes: r.notes,
      createdBy: r.createdBy,
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
      workSessionId: r.workSessionId,
      materialName: r.materialName ?? undefined,
      creatorName: r.creatorName ?? undefined,
    }));
  }

  static async addReceipt(
    companyId: number,
    userId: number,
    input: MaterialStockReceiptInput,
    client: DbClient = db
  ): Promise<MaterialStockReceipt> {
    assertPositiveQuantity(input.quantity);

    const [row] = await client
      .insert(materialStockReceipts)
      .values({
        companyId,
        materialId: input.materialId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
        workSessionId: input.workSessionId ?? null,
      })
      .returning();

    await MaterialInventoryService.upsertQuantity(
      companyId,
      input.materialId,
      input.quantity,
      client
    );

    return {
      id: row.id,
      companyId: row.companyId,
      materialId: row.materialId,
      quantity: String(row.quantity),
      unitPrice: row.unitPrice != null ? String(row.unitPrice) : null,
      invoiceNumber: row.invoiceNumber,
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
      workSessionId: row.workSessionId,
    };
  }

  static async getIssues(companyId: number): Promise<MaterialStockIssue[]> {
    const rows = await db
      .select({
        id: materialStockIssues.id,
        companyId: materialStockIssues.companyId,
        materialId: materialStockIssues.materialId,
        quantity: materialStockIssues.quantity,
        workOrderId: materialStockIssues.workOrderId,
        workSessionId: materialStockIssues.workSessionId,
        issuedTo: materialStockIssues.issuedTo,
        notes: materialStockIssues.notes,
        createdBy: materialStockIssues.createdBy,
        createdAt: materialStockIssues.createdAt,
        materialName: materials.name,
        creatorName: users.fullName,
        workOrderLabel: workOrders.taskDescription,
      })
      .from(materialStockIssues)
      .innerJoin(materials, eq(materialStockIssues.materialId, materials.id))
      .leftJoin(users, eq(materialStockIssues.createdBy, users.id))
      .leftJoin(workOrders, eq(materialStockIssues.workOrderId, workOrders.id))
      .where(eq(materialStockIssues.companyId, companyId))
      .orderBy(desc(materialStockIssues.createdAt));

    return rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      materialId: r.materialId,
      quantity: String(r.quantity),
      workOrderId: r.workOrderId,
      workSessionId: r.workSessionId,
      issuedTo: r.issuedTo,
      notes: r.notes,
      createdBy: r.createdBy,
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
      materialName: r.materialName ?? undefined,
      creatorName: r.creatorName ?? undefined,
      workOrderLabel: r.workOrderLabel ?? undefined,
    }));
  }

  static async addIssue(
    companyId: number,
    userId: number,
    input: MaterialStockIssueInput,
    client: DbClient = db
  ): Promise<MaterialStockIssue> {
    assertPositiveQuantity(input.quantity);
    await assertSufficientStock(companyId, input.materialId, input.quantity, client);

    const [row] = await client
      .insert(materialStockIssues)
      .values({
        companyId,
        materialId: input.materialId,
        quantity: input.quantity,
        workOrderId: input.workOrderId ?? null,
        workSessionId: input.workSessionId ?? null,
        issuedTo: input.issuedTo ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    await MaterialInventoryService.upsertQuantity(
      companyId,
      input.materialId,
      `-${input.quantity}`,
      client
    );

    return {
      id: row.id,
      companyId: row.companyId,
      materialId: row.materialId,
      quantity: String(row.quantity),
      workOrderId: row.workOrderId,
      workSessionId: row.workSessionId,
      issuedTo: row.issuedTo,
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    };
  }

  static async issueForWorkSession(
    companyId: number,
    actorUserId: number,
    params: {
      workSessionId: number;
      workOrderId: number | null;
      materialId: number;
      quantity: string;
      issuedTo: number;
      notes?: string | null;
    },
    client: DbClient = db
  ): Promise<MaterialStockIssue> {
    return this.addIssue(
      companyId,
      actorUserId,
      {
        materialId: params.materialId,
        quantity: params.quantity,
        workOrderId: params.workOrderId,
        workSessionId: params.workSessionId,
        issuedTo: params.issuedTo,
        notes: params.notes ?? null,
      },
      client
    );
  }

  static async returnForWorkSession(
    companyId: number,
    actorUserId: number,
    params: {
      workSessionId: number;
      materialId: number;
      quantity: string;
      workOrderId: number | null;
    },
    client: DbClient = db
  ): Promise<MaterialStockReceipt> {
    return this.addReceipt(
      companyId,
      actorUserId,
      {
        materialId: params.materialId,
        quantity: params.quantity,
        unitPrice: null,
        invoiceNumber: null,
        notes:
          params.workOrderId != null
            ? `Zwrot — sesja #${params.workSessionId}, zlecenie #${params.workOrderId}`
            : `Zwrot — sesja #${params.workSessionId}`,
        workSessionId: params.workSessionId,
      },
      client
    );
  }
}
