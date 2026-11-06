import { beforeAll, afterAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  companySettings,
  users,
  workOrders,
  workSessions,
  workOrderSpareParts,
  stockIssues,
  stockReceipts,
} from "@/db/schema";
import {
  createTestCompany,
  createTestUser,
  createTestCategory,
  createTestResource,
  cleanupTestCompany,
} from "@/test/integrationDb";
import { WorkOrderSparePartService as Parts } from "./WorkOrderSparePartService";
import { SparePartService } from "./SparePartService";
import { InventoryService } from "./InventoryService";
import { WorkerOrderService } from "../WorkerOrderService";
import { WorkerSessionService } from "../WorkerSessionService";
import { AdminSessionService } from "../AdminSessionService";
let companyId: number, categoryId: number;
beforeAll(async () => {
  companyId = (await createTestCompany()).id;
  categoryId = (await createTestCategory(companyId, { reqTaskDescription: false })).id;
  await db.insert(companySettings).values({ companyId, durEnabled: true, cancelWindowMinutes: 5 });
});
afterAll(() => cleanupTestCompany(companyId));
async function setup() {
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
    })
    .returning();
  const sessionId = await WorkerOrderService.acceptOrder(userId, companyId, order.id);
  const partId = await SparePartService.addPart(companyId, { name: "__ITEST worker mutation" });
  await InventoryService.setQuantity(companyId, partId, "5");
  return { userId, orderId: order.id, sessionId, partId };
}
type Fixture = Awaited<ReturnType<typeof setup>>;
const pick = (f: Fixture) =>
  Parts.pickPartFromWarehouse(
    companyId,
    f.userId,
    f.orderId,
    { partId: f.partId, quantity: "1" },
    f.userId
  );
const stock = async (f: Fixture) =>
  Number((await InventoryService.getPartInventory(companyId, f.partId))?.quantity);
it("picks and returns parts during an active repair", async () => {
  const f = await setup();
  const line = await pick(f);
  expect(await stock(f)).toBe(4);
  await Parts.returnPartToWarehouse(companyId, f.userId, line.id, f.orderId, f.userId);
  expect(await stock(f)).toBe(5);
});
it("rechecks stale authorization after completion for both pick and return", async () => {
  const f = await setup();
  const line = await pick(f);
  expect(await Parts.canWorkerAccessOrder(f.orderId, companyId, f.userId, true)).toBe(true);
  await WorkerSessionService.endActiveSession(f.userId, companyId, null, f.sessionId);
  await expect(pick(f)).rejects.toThrow("no_active_session");
  await expect(
    Parts.returnPartToWarehouse(companyId, f.userId, line.id, f.orderId, f.userId)
  ).rejects.toThrow("no_active_session");
  expect(await stock(f)).toBe(4);
  expect(
    await db.select().from(stockIssues).where(eq(stockIssues.workOrderId, f.orderId))
  ).toHaveLength(1);
  expect(
    await db.select().from(stockReceipts).where(eq(stockReceipts.workOrderSparePartId, line.id))
  ).toHaveLength(0);
});
it("rechecks DUR rights and active account at mutation time", async () => {
  const f = await setup();
  await db.update(users).set({ isDurWorker: false }).where(eq(users.id, f.userId));
  await expect(pick(f)).rejects.toThrow("forbidden");
  await db.update(users).set({ isDurWorker: true, isActive: false }).where(eq(users.id, f.userId));
  await expect(pick(f)).rejects.toThrow("forbidden");
  expect(await stock(f)).toBe(5);
});
it("rejects another employee and a changed assignee", async () => {
  const f = await setup();
  const other = (await createTestUser(companyId, { isDurWorker: true })).id;
  await expect(
    Parts.pickPartFromWarehouse(companyId, other, f.orderId, { partId: f.partId }, other)
  ).rejects.toThrow("no_active_session");
  await db.update(workOrders).set({ userId: other }).where(eq(workOrders.id, f.orderId));
  await expect(pick(f)).rejects.toThrow("forbidden");
  expect(await stock(f)).toBe(5);
});
it("checks feature switch again inside the transaction", async () => {
  const f = await setup();
  await db
    .update(companySettings)
    .set({ durEnabled: false })
    .where(eq(companySettings.companyId, companyId));
  try {
    await expect(pick(f)).rejects.toThrow("feature_disabled");
    expect(await stock(f)).toBe(5);
  } finally {
    await db
      .update(companySettings)
      .set({ durEnabled: true })
      .where(eq(companySettings.companyId, companyId));
  }
});
it("serializes cancellation versus picking: only one can commit", async () => {
  const f = await setup();
  const results = await Promise.allSettled([
    pick(f),
    WorkerSessionService.cancelActiveSession(f.userId, companyId, f.sessionId),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const lines = await db
    .select()
    .from(workOrderSpareParts)
    .where(eq(workOrderSpareParts.workOrderId, f.orderId));
  const sessions = await db.select().from(workSessions).where(eq(workSessions.id, f.sessionId));
  expect(await stock(f)).toBe(lines.length ? 4 : 5);
  expect(sessions).toHaveLength(lines.length ? 1 : 0);
});
it("admin completion and cancellation cannot leave a completed order without its session", async () => {
  const f = await setup();
  const results = await Promise.allSettled([
    AdminSessionService.forceCompleteSession(companyId, f.sessionId),
    WorkerSessionService.cancelActiveSession(f.userId, companyId, f.sessionId),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const sessions = await db.select().from(workSessions).where(eq(workSessions.id, f.sessionId));
  const [order] = await db.select().from(workOrders).where(eq(workOrders.id, f.orderId));
  expect(order.status).toBe(sessions.length ? "COMPLETED" : "PENDING");
});
it("cannot pick or return after an admin closes the session", async () => {
  const f = await setup();
  const line = await pick(f);
  await AdminSessionService.forceCompleteSession(companyId, f.sessionId);
  await expect(pick(f)).rejects.toThrow("no_active_session");
  await expect(
    Parts.returnPartToWarehouse(companyId, f.userId, line.id, f.orderId, f.userId)
  ).rejects.toThrow("no_active_session");
  expect(await stock(f)).toBe(4);
});
