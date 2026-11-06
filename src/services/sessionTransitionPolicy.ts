import { and, eq } from "drizzle-orm";
import { companySettings, sessionPhotos, workOrderSpareParts, workSessions } from "@/db/schema";
import type { WarehouseDb } from "./warehouse/warehouseTypes";

type Session = typeof workSessions.$inferSelect;
export function sessionEventTime(session: Session, occurredAt?: string): Date {
  const at = occurredAt === undefined ? new Date() : new Date(occurredAt);
  if (!Number.isFinite(at.getTime()) || at < session.startTime || at.getTime() > Date.now() + 60000)
    throw new Error("invalid_payload");
  return at;
}
export async function assertSessionTransition(
  tx: WarehouseDb,
  session: Session,
  kind: "end" | "cancel",
  at: Date
) {
  const [settings] = await tx
    .select()
    .from(companySettings)
    .where(eq(companySettings.companyId, session.companyId));
  if (kind === "end" && settings?.requirePhotoToFinish) {
    const photos = await tx
      .select({ id: sessionPhotos.id })
      .from(sessionPhotos)
      .where(eq(sessionPhotos.workSessionId, session.id))
      .limit(1);
    if (!photos.length) throw new Error("photo_required");
  }
  if (kind === "cancel") {
    const minutes = settings?.cancelWindowMinutes ?? 5;
    if (minutes <= 0 || at.getTime() - session.startTime.getTime() > minutes * 60000)
      throw new Error("cancel_window_expired");
    if (session.workOrderId) {
      const parts = await tx
        .select({ id: workOrderSpareParts.id })
        .from(workOrderSpareParts)
        .where(eq(workOrderSpareParts.workOrderId, session.workOrderId))
        .limit(1);
      if (parts.length) throw new Error("session_has_parts");
    }
  }
}
export async function lockActiveSession(
  tx: WarehouseDb,
  userId: number,
  companyId: number,
  sessionId?: number
) {
  const [session] = await tx
    .select()
    .from(workSessions)
    .where(
      and(
        eq(workSessions.userId, userId),
        eq(workSessions.companyId, companyId),
        eq(workSessions.status, "IN_PROGRESS"),
        sessionId === undefined ? undefined : eq(workSessions.id, sessionId)
      )
    )
    .for("update");
  if (!session) throw new Error("no_active_session");
  return session;
}
