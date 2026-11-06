import { and, eq, or } from "drizzle-orm";
import { users, resources, workSessions } from "@/db/schema";
import type { WarehouseDb } from "@/services/warehouse/warehouseTypes";

/** Both session entry points lock in the same order before checking availability. */
export async function lockSessionStart(
  tx: WarehouseDb,
  companyId: number,
  userId: number,
  resourceId: number
) {
  const [user] = await tx
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.companyId, companyId)))
    .for("update");
  const [resource] = await tx
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.id, resourceId), eq(resources.companyId, companyId)))
    .for("update");
  if (!user || !user.isActive || !resource) throw new Error("invalid_payload");
  const active = await tx
    .select({ userId: workSessions.userId })
    .from(workSessions)
    .where(
      and(
        eq(workSessions.companyId, companyId),
        eq(workSessions.status, "IN_PROGRESS"),
        or(eq(workSessions.userId, userId), eq(workSessions.resourceId, resourceId))
      )
    );
  if (active.some((row) => row.userId === userId)) throw new Error("session_active");
  if (active.length) throw new Error("resource_busy");
}
