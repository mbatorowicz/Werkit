import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { stockMovementOperations, materials } from "@/db/schema";
import { ApiRouteError } from "@/lib/apiRoute";
import type { WarehouseDb } from "./warehouseTypes";

export type ManualStockScope =
  | "dur:receipts"
  | "dur:issues"
  | "materials:receipts"
  | "materials:issues";
/** Receipt and mutation share one transaction. Retain receipts for delayed retries. */
export class ManualStockMovementService {
  static async execute(
    companyId: number,
    userId: number,
    operationId: string,
    scope: ManualStockScope,
    input: Record<string, unknown>,
    mutate: (tx: WarehouseDb) => Promise<unknown>
  ): Promise<unknown> {
    if (!/^[a-zA-Z0-9_-]{10,100}$/.test(operationId))
      throw new ApiRouteError("invalid_operation_id", 400);
    const requestHash = createHash("sha256").update(JSON.stringify({ scope, input })).digest("hex");
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${"stock-movement:" + operationId}, 0))`
      );
      const [saved] = await tx
        .select()
        .from(stockMovementOperations)
        .where(eq(stockMovementOperations.id, operationId));
      if (saved) {
        if (
          saved.companyId !== companyId ||
          saved.userId !== userId ||
          saved.requestHash !== requestHash
        )
          throw new ApiRouteError("operation_conflict", 409);
        return saved.result;
      }
      // Material services also serve automatic session movements. Manual requests
      // serialize the SKU here, without changing that separate API contract.
      if (scope.startsWith("materials:")) {
        const [sku] = await tx
          .select({ id: materials.id })
          .from(materials)
          .where(
            and(eq(materials.id, Number(input.materialId)), eq(materials.companyId, companyId))
          )
          .for("no key update");
        if (!sku) throw new ApiRouteError("material_not_found", 400);
      }
      const result = await mutate(tx);
      await tx
        .insert(stockMovementOperations)
        .values({ id: operationId, companyId, userId, requestHash, result });
      return result;
    });
  }
}
