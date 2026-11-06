import { db } from "@/db";
import {
  workSessions,
  gpsLogs,
  sessionPhotos,
  sessionNotes,
  workOrders,
  materialStockIssues,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { refreshPhotoUrls } from "@/lib/photoUpload";

export class AdminSessionService {
  /**
   * Pobiera szczegóły sesji, logi GPS, zdjęcia i notatki dla panelu administratora.
   */
  static async getSessionDetails(companyId: number, sessionId: number) {
    const sessionRow = await db
      .select({ id: workSessions.id })
      .from(workSessions)
      .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)))
      .limit(1);
    if (!sessionRow[0]) throw new Error("not_found");

    const [logs, photos, notes] = await Promise.all([
      db
        .select()
        .from(gpsLogs)
        .where(eq(gpsLogs.workSessionId, sessionId))
        .orderBy(desc(gpsLogs.timestamp)),
      db
        .select()
        .from(sessionPhotos)
        .where(eq(sessionPhotos.workSessionId, sessionId))
        .orderBy(desc(sessionPhotos.createdAt)),
      db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.workSessionId, sessionId))
        .orderBy(desc(sessionNotes.createdAt)),
    ]);

    // Dla zdjęć z Vercel Blob (private store) generuj świeży Signed URL przez head()
    const photosWithSignedUrls = await refreshPhotoUrls(photos);

    return { logs, photos: photosWithSignedUrls, notes };
  }

  /** Kończy „wiszącą” sesję IN_PROGRESS — ustawia status COMPLETED i czas zakończenia (jak domknięcie z aplikacji). */
  static async forceCompleteSession(companyId: number, sessionId: number) {
    await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(workSessions)
        .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)))
        .for("update");
      if (!session) throw new Error("not_found");
      if (session.status !== "IN_PROGRESS") throw new Error("not_in_progress");
      await tx
        .update(workSessions)
        .set({ status: "COMPLETED", endTime: new Date() })
        .where(eq(workSessions.id, sessionId));
      if (session.workOrderId != null)
        await tx
          .update(workOrders)
          .set({ status: "COMPLETED" })
          .where(and(eq(workOrders.id, session.workOrderId), eq(workOrders.companyId, companyId)));
    });
  }

  /** Deletes only an unlinked archived session without warehouse history. */
  static async deleteArchivedSession(companyId: number, sessionId: number, _actorUserId?: number) {
    await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(workSessions)
        .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)))
        .for("update");
      if (!session) throw new Error("not_found");
      if (session.status === "IN_PROGRESS") throw new Error("session_still_active");
      if (session.workOrderId != null) throw new Error("order_has_history");
      const issues = await tx
        .select({ id: materialStockIssues.id })
        .from(materialStockIssues)
        .where(eq(materialStockIssues.workSessionId, sessionId))
        .limit(1);
      if (issues.length) throw new Error("order_has_history");
      await tx.delete(workSessions).where(eq(workSessions.id, sessionId));
    });
  }
}
