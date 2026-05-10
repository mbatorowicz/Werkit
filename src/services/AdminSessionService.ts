import { db } from '@/db';
import { workSessions, gpsLogs, sessionPhotos, sessionNotes, customers, resources, materials, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export class AdminSessionService {
  /**
   * Pobiera szczegóły sesji, logi GPS, zdjęcia i notatki dla panelu administratora.
   */
  static async getSessionDetails(sessionId: number) {
    const [logs, photos, notes] = await Promise.all([
      db.select().from(gpsLogs).where(eq(gpsLogs.workSessionId, sessionId)).orderBy(desc(gpsLogs.timestamp)),
      db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, sessionId)).orderBy(desc(sessionPhotos.createdAt)),
      db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, sessionId)).orderBy(desc(sessionNotes.createdAt))
    ]);

    return { logs, photos, notes };
  }
}
