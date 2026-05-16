import { db } from '@/db';
import { workSessions, gpsLogs, sessionPhotos, sessionNotes, workOrders } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

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
    if (!sessionRow[0]) throw new Error('not_found');

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

    return { logs, photos, notes };
  }

  /** Kończy „wiszącą” sesję IN_PROGRESS — ustawia status COMPLETED i czas zakończenia (jak domknięcie z aplikacji). */
  static async forceCompleteSession(companyId: number, sessionId: number) {
    const rows = await db
      .select()
      .from(workSessions)
      .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)))
      .limit(1);
    if (rows.length === 0) throw new Error('not_found');
    if (rows[0].status !== 'IN_PROGRESS') throw new Error('not_in_progress');

    await db
      .update(workSessions)
      .set({ status: 'COMPLETED', endTime: new Date() })
      .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)));

    const wid = rows[0].workOrderId;
    if (wid != null) {
      await db
        .update(workOrders)
        .set({ status: 'COMPLETED' })
        .where(and(eq(workOrders.id, wid), eq(workOrders.companyId, companyId)));
    }
  }

  /**
   * Usuwa zakończoną sesję z ewidencji. Jeśli sesja pochodziła ze zlecenia systemowego (`work_order_id`),
   * usuwa też powiązany wiersz `work_orders` (marker „zaakceptowane” po stronie dyspozycji).
   */
  static async deleteArchivedSession(companyId: number, sessionId: number) {
    const rows = await db
      .select()
      .from(workSessions)
      .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)))
      .limit(1);
    if (rows.length === 0) throw new Error('not_found');
    const session = rows[0];
    if (session.status === 'IN_PROGRESS') throw new Error('session_still_active');

    await db.transaction(async (tx) => {
      const wid = session.workOrderId;
      await tx
        .delete(workSessions)
        .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)));
      if (wid != null) {
        await tx
          .delete(workOrders)
          .where(and(eq(workOrders.id, wid), eq(workOrders.companyId, companyId)));
      }
    });
  }
}
