import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  workOrders,
  workSessions,
  workOrderSpareParts,
  materialStockIssues,
  stockIssues,
} from "@/db/schema";

export class OrderDeletionService {
  static async deleteUnused(companyId: number, orderId: number, ownerUserId?: number) {
    return db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(workOrders)
        .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)))
        .for("update");
      if (!order) throw new Error("not_found");
      if (
        ownerUserId !== undefined &&
        (order.userId !== ownerUserId || order.createdById !== ownerUserId)
      )
        throw new Error("forbidden");
      if (!["PENDING", "CANCELLED"].includes(order.status)) throw new Error("order_has_history");
      const sessions = await tx
        .select({ id: workSessions.id })
        .from(workSessions)
        .where(eq(workSessions.workOrderId, orderId))
        .limit(1);
      const parts = await tx
        .select({ id: workOrderSpareParts.id })
        .from(workOrderSpareParts)
        .where(eq(workOrderSpareParts.workOrderId, orderId))
        .limit(1);
      const materials = await tx
        .select({ id: materialStockIssues.id })
        .from(materialStockIssues)
        .where(eq(materialStockIssues.workOrderId, orderId))
        .limit(1);
      const issues = await tx
        .select({ id: stockIssues.id })
        .from(stockIssues)
        .where(eq(stockIssues.workOrderId, orderId))
        .limit(1);
      if (sessions.length || parts.length || materials.length || issues.length)
        throw new Error("order_has_history");
      await tx.delete(workOrders).where(eq(workOrders.id, orderId));
    });
  }
}
