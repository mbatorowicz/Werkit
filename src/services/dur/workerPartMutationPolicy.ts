import { and, eq } from "drizzle-orm";
import { companySettings, users, workOrders, workSessions } from "@/db/schema";
import type { WarehouseDb } from "@/services/warehouse/warehouseTypes";
import { StockMovementError } from "./StockMovementError";

/** Lock order matches session completion/cancellation: session first, then order. */
export async function lockWorkerPartMutation(
  tx: WarehouseDb,
  companyId: number,
  userId: number,
  workOrderId: number
) {
  const [session] = await tx
    .select({ id: workSessions.id })
    .from(workSessions)
    .where(
      and(
        eq(workSessions.companyId, companyId),
        eq(workSessions.userId, userId),
        eq(workSessions.workOrderId, workOrderId),
        eq(workSessions.status, "IN_PROGRESS")
      )
    )
    .for("update");
  if (!session) throw new StockMovementError("no_active_session");
  const [order] = await tx
    .select()
    .from(workOrders)
    .where(and(eq(workOrders.id, workOrderId), eq(workOrders.companyId, companyId)))
    .for("update");
  if (
    !order ||
    order.userId !== userId ||
    order.status !== "IN_PROGRESS" ||
    order.orderType !== "machine_repair"
  )
    throw new StockMovementError("forbidden");
  const [user] = await tx
    .select({ active: users.isActive, dur: users.isDurWorker })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.companyId, companyId)));
  if (!user?.active || !user.dur) throw new StockMovementError("forbidden");
  const [settings] = await tx
    .select({ enabled: companySettings.durEnabled })
    .from(companySettings)
    .where(eq(companySettings.companyId, companyId));
  if (!settings?.enabled) throw new StockMovementError("feature_disabled");
}
