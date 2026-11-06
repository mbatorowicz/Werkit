/** Synthetic-only service load. Invoked by scripts/pilot-drill.mjs, never against .env.local. */
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { db, pool } from "@/db";
import { eq } from "drizzle-orm";
import {
  companySettings,
  workOrders,
  workSessions,
  gpsLogs,
  sessionNotes,
  offlineOperations,
  sessionPhotos,
} from "@/db/schema";
import {
  createTestCompany,
  createTestUser,
  createTestCategory,
  createTestResource,
} from "@/test/integrationDb";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import { WorkerSessionService } from "@/services/WorkerSessionService";
import { AdminOrderService } from "@/services/AdminOrderService";
import { OfflineOperationService } from "@/services/OfflineOperationService";
import { GpsService } from "@/services/GpsService";
import { SparePartService } from "@/services/dur/SparePartService";
import { InventoryService } from "@/services/dur/InventoryService";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";

const metrics: Record<
  string,
  { count: number; errors: number; p50Ms: number; p95Ms: number; maxMs: number }
> = {};
async function phase<T>(name: string, items: T[], fn: (item: T, i: number) => Promise<unknown>) {
  const durations: number[] = [];
  const results = await Promise.allSettled(
    items.map(async (item, i) => {
      const t = performance.now();
      try {
        return await fn(item, i);
      } finally {
        durations.push(performance.now() - t);
      }
    })
  );
  durations.sort((a, b) => a - b);
  const failures = results.filter((r) => r.status === "rejected");
  metrics[name] = {
    count: items.length,
    errors: failures.length,
    p50Ms: Math.round(durations[Math.ceil(durations.length * 0.5) - 1]),
    p95Ms: Math.round(durations[Math.ceil(durations.length * 0.95) - 1]),
    maxMs: Math.round(durations.at(-1) ?? 0),
  };
  console.log(name, JSON.stringify(metrics[name]));
  if (failures.length)
    throw new Error(
      `${name}: ${failures.length} failures; ${String((failures[0] as PromiseRejectedResult).reason)}`
    );
  return results.map((r) => (r as PromiseFulfilledResult<unknown>).value);
}
async function main() {
  const urls = [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
  ].map((k) => new URL(process.env[k] || ""));
  assert.equal(process.env.PILOT_DRILL, "isolated-local");
  assert(urls.every((u) => u.hostname === "127.0.0.1" && u.pathname === "/werkit_drill_source"));
  const existing = await pool.query("select count(*)::int as n from companies");
  assert.equal(existing.rows[0].n, 0);
  const companyId = (await createTestCompany()).id;
  await db
    .insert(companySettings)
    .values({ companyId, durEnabled: true, requirePhotoToFinish: false });
  const categoryId = (await createTestCategory(companyId, { reqTaskDescription: false })).id;
  const workers = [];
  for (let i = 0; i < 40; i++) {
    const userId = (await createTestUser(companyId, { isDurWorker: true })).id;
    const resourceId = (await createTestResource(companyId)).id;
    const [order] = await db
      .insert(workOrders)
      .values({
        companyId,
        userId,
        resourceId,
        categoryId,
        orderType: "machine_repair",
        status: "PENDING",
        createdById: userId,
      })
      .returning();
    workers.push({ userId, resourceId, orderId: order.id, sessionId: 0 });
  }
  await phase("admin-edit-40", workers, (w) =>
    AdminOrderService.updateOrder(companyId, w.orderId, { taskDescription: "Synthetic load" })
  );
  await phase("start-40", workers, async (w) => {
    w.sessionId = await WorkerOrderService.acceptOrder(w.userId, companyId, w.orderId);
  });
  const partId = await SparePartService.addPart(companyId, { name: "__ITEST shared bearing" });
  await InventoryService.setQuantity(companyId, partId, "100");
  const lines = await phase("shared-stock-pick-40", workers, (w) =>
    WorkOrderSparePartService.pickPartFromWarehouse(companyId, w.userId, w.orderId, {
      partId,
      quantity: "1",
    })
  );
  assert.equal(Number((await InventoryService.getPartInventory(companyId, partId))?.quantity), 60);
  await phase("shared-stock-return-40", workers, (w, i) =>
    WorkOrderSparePartService.returnPartToWarehouse(
      companyId,
      w.userId,
      (lines[i] as { id: number }).id,
      w.orderId
    )
  );
  assert.equal(Number((await InventoryService.getPartInventory(companyId, partId))?.quantity), 100);
  for (let round = 0; round < 5; round++) {
    await phase(`dashboard-${round}`, workers, (w) =>
      WorkerSessionService.getActiveSessionWithDetails(w.userId, companyId)
    );
    await phase(`gps-${round}`, workers, async (w) => {
      const points = Array.from({ length: 20 }, () => ({
        pointId: randomUUID(),
        sessionId: w.sessionId,
        lat: 52.1,
        lng: 21.1,
        timestamp: new Date().toISOString(),
      }));
      assert.equal((await GpsService.saveSessionPoints(w.userId, companyId, points)).length, 20);
      assert.equal((await GpsService.saveSessionPoints(w.userId, companyId, points)).length, 20);
    });
  }
  await phase("offline-note-retry-40", workers, async (w) => {
    const action = {
      operationId: randomUUID(),
      type: "save_note",
      payload: { sessionId: w.sessionId, note: "__ITEST offline recovery" },
    };
    await OfflineOperationService.execute(w.userId, companyId, action);
    assert.equal(
      (await OfflineOperationService.execute(w.userId, companyId, action)).replayed,
      true
    );
  });
  await db.insert(sessionPhotos).values(
    workers.map((w) => ({
      workSessionId: w.sessionId,
      photoType: "AD_HOC",
      photoUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=",
    }))
  );
  const replays: { userId: number; companyId: number; action: unknown }[] = [];
  await phase("finish-offline-40", workers, async (w) => {
    const action = {
      operationId: randomUUID(),
      type: "end_session",
      payload: { sessionId: w.sessionId, occurredAt: new Date().toISOString() },
    };
    replays.push({ userId: w.userId, companyId, action });
    await OfflineOperationService.execute(w.userId, companyId, action);
    assert.equal(
      (await OfflineOperationService.execute(w.userId, companyId, action)).replayed,
      true
    );
  });
  writeFileSync(".pilot-drill/replay.json", JSON.stringify(replays));
  const sessions = await db
    .select()
    .from(workSessions)
    .where(eq(workSessions.companyId, companyId));
  assert.equal(sessions.length, 40);
  assert(sessions.every((s) => s.status === "COMPLETED"));
  assert.equal((await db.select().from(gpsLogs)).length, 4000);
  assert.equal((await db.select().from(sessionNotes)).length, 40);
  assert.equal((await db.select().from(offlineOperations)).length, 80);
  writeFileSync(
    process.env.PILOT_REPORT!,
    JSON.stringify(
      {
        workers: 40,
        metrics,
        checks: { gps: 4000, notes: 40, receipts: 80, completedSessions: 40, stock: 100 },
        scope: "services + local PostgreSQL; not HTTP/Vercel/device throughput",
      },
      null,
      2
    )
  );
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Drill failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
