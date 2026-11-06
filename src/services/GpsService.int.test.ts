import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workSessions, gpsLogs, resourceCategories } from "@/db/schema";
import {
  createTestCompany,
  createTestUser,
  createTestResource,
  createTestCategory,
  cleanupTestCompany,
} from "@/test/integrationDb";
import { WorkerSessionService } from "./WorkerSessionService";
import { GpsService } from "./GpsService";

describe("GPS session protocol", () => {
  let companyId: number, userId: number, sessionId: number, categoryId: number;
  const start = new Date(Date.now() - 3 * 86400000);
  const end = new Date(start.getTime() + 3600000);
  const point = () => ({
    pointId: randomUUID(),
    sessionId,
    lat: 52.1,
    lng: 21.1,
    timestamp: new Date(start.getTime() + 1000).toISOString(),
  });
  beforeAll(async () => {
    companyId = (await createTestCompany()).id;
    userId = (await createTestUser(companyId)).id;
    categoryId = (await createTestCategory(companyId)).id;
    const resourceId = (await createTestResource(companyId)).id;
    sessionId = (
      await WorkerSessionService.createWizardSession(userId, companyId, { categoryId, resourceId })
    ).id;
    await db
      .update(workSessions)
      .set({ startTime: start, endTime: end, status: "COMPLETED" })
      .where(eq(workSessions.id, sessionId));
  });
  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });
  it("accepts delayed points of a closed session once even with concurrent retry", async () => {
    const p = point();
    const results = await Promise.all(
      [1, 2].map(() => GpsService.saveSessionPoints(userId, companyId, [p]))
    );
    expect(results).toEqual([[p.pointId], [p.pointId]]);
    expect(
      await db.select().from(gpsLogs).where(eq(gpsLogs.clientPointId, p.pointId))
    ).toHaveLength(1);
  });
  it("acknowledges valid points only, not samples after completion", async () => {
    const valid = point();
    const late = { ...point(), timestamp: new Date(end.getTime() + 1000).toISOString() };
    expect(await GpsService.saveSessionPoints(userId, companyId, [valid, late])).toEqual([
      valid.pointId,
    ]);
    expect(
      await db.select().from(gpsLogs).where(eq(gpsLogs.clientPointId, late.pointId))
    ).toHaveLength(0);
  });
  it("rejects unbound, foreign-user and stationary-session points", async () => {
    const other = await createTestUser(companyId);
    await expect(GpsService.saveSessionPoints(other.id, companyId, [point()])).rejects.toThrow(
      "gps_session_conflict"
    );
    await expect(
      GpsService.saveSessionPoints(userId, companyId, [{ lat: 52, lng: 21 }])
    ).rejects.toThrow("invalid_gps_point");
    await db
      .update(resourceCategories)
      .set({ isStationary: true })
      .where(eq(resourceCategories.id, categoryId));
    await expect(GpsService.saveSessionPoints(userId, companyId, [point()])).rejects.toThrow(
      "gps_stationary_session"
    );
  });
});
