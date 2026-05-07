import { db } from '@/db';
import { workSessions, gpsLogs } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { Coord } from '@/types/worker';

export type GpsPoint = Coord & { timestamp?: string };

export class GpsService {
  static async getActiveSessionGpsLogs(userId: number) {
    const activeSessions = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (activeSessions.length === 0) return [];

    const logs = await db.select().from(gpsLogs).where(eq(gpsLogs.workSessionId, activeSessions[0].id)).orderBy(asc(gpsLogs.timestamp));
    return logs.map(l => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) }));
  }

  static async saveGpsLogs(userId: number, points: GpsPoint[]) {
    if (points.length === 0) return 0;

    const activeSessions = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);

    if (activeSessions.length === 0) {
      throw new Error('no_active_session');
    }

    const valuesToInsert = points
      .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
      .map(p => ({
        workSessionId: activeSessions[0].id,
        latitude: p.lat.toString(),
        longitude: p.lng.toString(),
        timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
      }));

    if (valuesToInsert.length > 0) {
      await db.insert(gpsLogs).values(valuesToInsert);
    }

    return valuesToInsert.length;
  }
}
