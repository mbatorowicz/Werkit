import { db } from "@/db";
import { materials, materialStockIssues, materialStockReceipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import { parseDecimalInput } from "@/lib/decimalInput";
import { MaterialStockMovementService } from "./MaterialStockMovementService";
import { MaterialStockMovementError } from "./MaterialStockMovementError";

type DbClient = NodePgDatabase<typeof schema>;

export class WorkSessionMaterialService {
  static async assertMaterialBelongsToCompany(
    materialId: number,
    companyId: number,
    client: DbClient = db
  ): Promise<boolean> {
    const [row] = await client
      .select({ id: materials.id })
      .from(materials)
      .where(and(eq(materials.id, materialId), eq(materials.companyId, companyId)))
      .limit(1);
    return !!row;
  }

  /** WZ przy starcie sesji z materiałem (acceptOrder / wizard). */
  static async issueForSessionStart(
    companyId: number,
    actorUserId: number,
    params: {
      workSessionId: number;
      workOrderId: number | null;
      materialId: number;
      quantityTons: string;
      issuedTo: number;
    },
    client: DbClient = db
  ): Promise<void> {
    const qty = parseDecimalInput(params.quantityTons);
    if (qty == null || qty <= 0) return;

    const ok = await this.assertMaterialBelongsToCompany(params.materialId, companyId, client);
    if (!ok) throw new MaterialStockMovementError("material_not_found");

    const [existing] = await client
      .select({ id: materialStockIssues.id })
      .from(materialStockIssues)
      .where(eq(materialStockIssues.workSessionId, params.workSessionId))
      .limit(1);
    if (existing) return;

    await MaterialStockMovementService.issueForWorkSession(
      companyId,
      actorUserId,
      {
        workSessionId: params.workSessionId,
        workOrderId: params.workOrderId,
        materialId: params.materialId,
        quantity: params.quantityTons,
        issuedTo: params.issuedTo,
        notes: params.workOrderId
          ? `Wydanie na start sesji — zlecenie #${params.workOrderId}`
          : "Wydanie na start sesji (wizard)",
      },
      client
    );
  }

  /** PZ zwrot jeśli sesja miała WZ — idempotentne. */
  static async returnForSessionIfIssued(
    companyId: number,
    actorUserId: number,
    workSessionId: number,
    client: DbClient = db
  ): Promise<void> {
    const [issue] = await client
      .select()
      .from(materialStockIssues)
      .where(
        and(
          eq(materialStockIssues.companyId, companyId),
          eq(materialStockIssues.workSessionId, workSessionId)
        )
      )
      .limit(1);
    if (!issue) return;

    const [existingReturn] = await client
      .select({ id: materialStockReceipts.id })
      .from(materialStockReceipts)
      .where(
        and(
          eq(materialStockReceipts.companyId, companyId),
          eq(materialStockReceipts.workSessionId, workSessionId)
        )
      )
      .limit(1);
    if (existingReturn) return;

    await MaterialStockMovementService.returnForWorkSession(
      companyId,
      actorUserId,
      {
        workSessionId,
        materialId: issue.materialId,
        quantity: String(issue.quantity),
        workOrderId: issue.workOrderId,
      },
      client
    );
  }

  /** Zwrot dla wszystkich sesji powiązanych ze zleceniem (deleteOrder). */
  static async returnForOrderSessions(
    companyId: number,
    actorUserId: number,
    workOrderId: number,
    client: DbClient = db
  ): Promise<void> {
    const issueSessions = await client
      .select({ workSessionId: materialStockIssues.workSessionId })
      .from(materialStockIssues)
      .where(
        and(
          eq(materialStockIssues.companyId, companyId),
          eq(materialStockIssues.workOrderId, workOrderId)
        )
      );

    const seen = new Set<number>();
    for (const row of issueSessions) {
      if (row.workSessionId == null || seen.has(row.workSessionId)) continue;
      seen.add(row.workSessionId);
      await this.returnForSessionIfIssued(companyId, actorUserId, row.workSessionId, client);
    }

    const { workSessions } = await import("@/db/schema");
    const sessionRows = await client
      .select({ id: workSessions.id })
      .from(workSessions)
      .where(eq(workSessions.workOrderId, workOrderId));

    for (const s of sessionRows) {
      await this.returnForSessionIfIssued(companyId, actorUserId, s.id, client);
    }
  }
}
