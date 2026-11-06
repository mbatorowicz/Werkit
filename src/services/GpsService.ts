import { db } from "@/db";
import { workSessions, gpsLogs, resourceCategories } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { Coord } from "@/types/worker";
import { assertGpsPayloadSize, normalizeGpsPoints } from "@/lib/gpsPayloadLimits";

export type GpsPoint = Coord & { timestamp?: string };

export class GpsService {
  /** v2: session ownership and sample time, not the session active at upload time. */
  static async saveSessionPoints(
    userId: number,
    companyId: number,
    input: unknown[],
    now = new Date()
  ): Promise<string[]> {
    assertGpsPayloadSize(input);
    if (!input.length) return [];
    const points = input.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("invalid_gps_point");
      const p = raw as Record<string, unknown>;
      if (
        typeof p.pointId !== "string" ||
        !/^[a-zA-Z0-9_-]{10,100}$/.test(p.pointId) ||
        !Number.isInteger(p.sessionId) ||
        Number(p.sessionId) < 1 ||
        typeof p.timestamp !== "string"
      )
        throw new Error("invalid_gps_point");
      const timestamp = new Date(p.timestamp);
      // Bounds relative to the originating session are checked below, allowing delayed uploads.
      const normalized = normalizeGpsPoints([p], timestamp);
      if (
        normalized.length !== 1 ||
        !Number.isFinite(timestamp.getTime()) ||
        timestamp.getTime() > now.getTime() + 300_000
      )
        throw new Error("invalid_gps_point");
      return {
        pointId: p.pointId,
        sessionId: Number(p.sessionId),
        timestamp,
        lat: normalized[0].lat,
        lng: normalized[0].lng,
      };
    });
    const sessionId = points[0].sessionId;
    if (points.some((p) => p.sessionId !== sessionId)) throw new Error("invalid_gps_point");
    return db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(workSessions)
        .where(
          and(
            eq(workSessions.id, sessionId),
            eq(workSessions.userId, userId),
            eq(workSessions.companyId, companyId)
          )
        )
        .for("update");
      if (!session || !["IN_PROGRESS", "COMPLETED"].includes(session.status))
        throw new Error("gps_session_conflict");
      if (session.categoryId) {
        const [category] = await tx
          .select({ stationary: resourceCategories.isStationary })
          .from(resourceCategories)
          .where(eq(resourceCategories.id, session.categoryId));
        if (category?.stationary) throw new Error("gps_stationary_session");
      }
      const eligible = points.filter(
        (p) =>
          p.timestamp >= session.startTime && (!session.endTime || p.timestamp <= session.endTime)
      );
      if (!eligible.length) return [];
      await tx
        .insert(gpsLogs)
        .values(
          eligible.map((p) => ({
            clientPointId: p.pointId,
            workSessionId: sessionId,
            latitude: String(p.lat),
            longitude: String(p.lng),
            timestamp: p.timestamp,
          }))
        )
        .onConflictDoNothing({ target: gpsLogs.clientPointId });
      const saved = await tx
        .select()
        .from(gpsLogs)
        .where(
          inArray(
            gpsLogs.clientPointId,
            eligible.map((p) => p.pointId)
          )
        );
      for (const p of eligible) {
        const row = saved.find((r) => r.clientPointId === p.pointId);
        if (
          !row ||
          row.workSessionId !== sessionId ||
          row.timestamp.getTime() !== p.timestamp.getTime() ||
          Math.abs(Number(row.latitude) - p.lat) > 0.00000001 ||
          Math.abs(Number(row.longitude) - p.lng) > 0.00000001
        )
          throw new Error("gps_session_conflict");
      }
      return eligible.map((p) => p.pointId);
    });
  }

  static async getActiveSessionGpsLogs(userId: number, companyId: number) {
    const activeSessions = await db
      .select()
      .from(workSessions)
      .where(
        and(
          eq(workSessions.userId, userId),
          eq(workSessions.companyId, companyId),
          eq(workSessions.status, "IN_PROGRESS")
        )
      )
      .limit(1);
    if (activeSessions.length === 0) return [];

    const logs = await db
      .select()
      .from(gpsLogs)
      .where(eq(gpsLogs.workSessionId, activeSessions[0].id))
      .orderBy(asc(gpsLogs.timestamp));
    return logs.map((l) => ({
      lat: parseFloat(l.latitude),
      lng: parseFloat(l.longitude),
      recordedAt: l.timestamp instanceof Date ? l.timestamp.toISOString() : String(l.timestamp),
    }));
  }

  static async saveGpsLogs(
    userId: number,
    companyId: number,
    points: GpsPoint[],
    now: Date = new Date()
  ) {
    assertGpsPayloadSize(points);
    if (points.length === 0) return 0;

    const activeSessions = await db
      .select()
      .from(workSessions)
      .where(
        and(
          eq(workSessions.userId, userId),
          eq(workSessions.companyId, companyId),
          eq(workSessions.status, "IN_PROGRESS")
        )
      )
      .limit(1);

    if (activeSessions.length === 0) {
      throw new Error("no_active_session");
    }

    const valuesToInsert = normalizeGpsPoints(points, now).map((p) => ({
      workSessionId: activeSessions[0].id,
      latitude: p.lat.toString(),
      longitude: p.lng.toString(),
      timestamp: p.timestamp,
    }));

    if (valuesToInsert.length > 0) {
      await db.insert(gpsLogs).values(valuesToInsert);
    }

    return valuesToInsert.length;
  }
}
