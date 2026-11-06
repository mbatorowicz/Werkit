import { AdminSessionService } from "./AdminSessionService";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  workSessions,
  workOrders,
  resourceCategories,
  companySettings,
  sessionPhotos,
  materialStockIssues,
  materialStockReceipts,
  materialInventory,
  users,
  stockIssues,
  workOrderSpareParts,
} from "@/db/schema";
import {
  createTestCompany,
  createTestUser,
  createTestResource,
  createTestCategory,
  createTestMaterial,
  cleanupTestCompany,
} from "@/test/integrationDb";
import { WorkerSessionService } from "./WorkerSessionService";
import { WorkerOrderService } from "./WorkerOrderService";
import { AdminOrderService } from "./AdminOrderService";
import { OfflineOperationService } from "./OfflineOperationService";
import { MaterialStockMovementService } from "./materials/MaterialStockMovementService";
import { SparePartService } from "./dur/SparePartService";
import { InventoryService } from "./dur/InventoryService";
import { WorkOrderSparePartService } from "./dur/WorkOrderSparePartService";
let companyId: number, categoryId: number;
beforeAll(async () => {
  companyId = (await createTestCompany()).id;
  categoryId = (await createTestCategory(companyId, { reqTaskDescription: false })).id;
  await db
    .insert(companySettings)
    .values({ companyId, requirePhotoToFinish: true, cancelWindowMinutes: 5, durEnabled: true });
});
afterAll(async () => {
  await cleanupTestCompany(companyId);
});
async function worker() {
  const userId = (await createTestUser(companyId)).id;
  const resourceId = (await createTestResource(companyId)).id;
  return { userId, resourceId };
}
async function start() {
  const w = await worker();
  const session = await WorkerSessionService.createWizardSession(w.userId, companyId, {
    resourceId: w.resourceId,
    categoryId,
  });
  return { ...w, session };
}
function offline(sessionId: number, type: string, occurredAt = new Date().toISOString()) {
  return { operationId: randomUUID(), type, payload: { sessionId, occurredAt } };
}
it("requires a persisted photo for both direct and offline completion", async () => {
  const { userId, session } = await start();
  await expect(
    WorkerSessionService.endActiveSession(userId, companyId, null, session.id)
  ).rejects.toThrow("photo_required");
  const action = offline(session.id, "end_session");
  await expect(OfflineOperationService.execute(userId, companyId, action)).rejects.toThrow(
    "photo_required"
  );
  expect(
    (await db.select().from(workSessions).where(eq(workSessions.id, session.id)))[0].status
  ).toBe("IN_PROGRESS");
  await db.insert(sessionPhotos).values({
    workSessionId: session.id,
    photoUrl: "https://example.test/photo.jpg",
    photoType: "AD_HOC",
  });
  await OfflineOperationService.execute(userId, companyId, action);
  expect((await OfflineOperationService.execute(userId, companyId, action)).replayed).toBe(true);
});
it("enforces the cancellation window while accepting a timely offline event delivered later", async () => {
  const { userId, session } = await start();
  const earlier = new Date(Date.now() - 3600000);
  await db.update(workSessions).set({ startTime: earlier }).where(eq(workSessions.id, session.id));
  await expect(
    WorkerSessionService.cancelActiveSession(userId, companyId, session.id)
  ).rejects.toThrow("cancel_window_expired");
  await expect(
    OfflineOperationService.execute(userId, companyId, offline(session.id, "cancel_session"))
  ).rejects.toThrow("cancel_window_expired");
  const timely = offline(
    session.id,
    "cancel_session",
    new Date(earlier.getTime() + 60000).toISOString()
  );
  await OfflineOperationService.execute(userId, companyId, timely);
  expect((await OfflineOperationService.execute(userId, companyId, timely)).replayed).toBe(true);
});
it("serializes direct finish versus cancellation: only one succeeds", async () => {
  const { userId, session } = await start();
  await db.insert(sessionPhotos).values({
    workSessionId: session.id,
    photoUrl: "https://example.test/p.jpg",
    photoType: "AD_HOC",
  });
  const results = await Promise.allSettled([
    WorkerSessionService.endActiveSession(userId, companyId, null, session.id),
    WorkerSessionService.cancelActiveSession(userId, companyId, session.id),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
});
it("rejects foreign/group categories, missing required fields and denied wizard permission", async () => {
  const w = await worker();
  const group = (await createTestCategory(companyId, { isGroup: true })).id;
  await expect(
    WorkerSessionService.createWizardSession(w.userId, companyId, { ...w, categoryId: group })
  ).rejects.toThrow("invalid_category");
  const other = await createTestCompany();
  try {
    const foreign = (await createTestCategory(other.id)).id;
    await expect(
      WorkerSessionService.createWizardSession(w.userId, companyId, { ...w, categoryId: foreign })
    ).rejects.toThrow("invalid_category");
  } finally {
    await cleanupTestCompany(other.id);
  }
  const required = (await createTestCategory(companyId)).id;
  await expect(
    WorkerSessionService.createWizardSession(w.userId, companyId, { ...w, categoryId: required })
  ).rejects.toThrow("missing_task_description");
  await db.update(users).set({ canCreateOwnOrders: false }).where(eq(users.id, w.userId));
  await expect(
    WorkerSessionService.createWizardSession(w.userId, companyId, { ...w, categoryId })
  ).rejects.toThrow("forbidden");
});
it("preserves repair kind and description and requires a DUR technician", async () => {
  const w = await worker();
  const repair = (await createTestCategory(companyId)).id;
  await db
    .update(resourceCategories)
    .set({ orderType: "machine_repair" })
    .where(eq(resourceCategories.id, repair));
  const body = { ...w, categoryId: repair, repairDescription: "Broken bearing" };
  await expect(WorkerSessionService.createWizardSession(w.userId, companyId, body)).rejects.toThrow(
    "forbidden"
  );
  await db.update(users).set({ isDurWorker: true }).where(eq(users.id, w.userId));
  const session = await WorkerSessionService.createWizardSession(w.userId, companyId, body);
  expect(session.orderType).toBe("machine_repair");
  expect(session.repairDescription).toBe("Broken bearing");
});
it("never returns consumed material or erases session history on delete", async () => {
  const w = await worker();
  const materialId = (await createTestMaterial(companyId)).id;
  await MaterialStockMovementService.addReceipt(companyId, w.userId, {
    materialId,
    quantity: "10",
  });
  const [order] = await db
    .insert(workOrders)
    .values({
      companyId,
      userId: w.userId,
      resourceId: w.resourceId,
      categoryId,
      materialId,
      quantityTons: "3",
      status: "PENDING",
      createdById: w.userId,
    })
    .returning();
  const id = await WorkerOrderService.acceptOrder(w.userId, companyId, order.id);
  await db
    .insert(sessionPhotos)
    .values({ workSessionId: id, photoUrl: "https://example.test/p.jpg", photoType: "AD_HOC" });
  await WorkerSessionService.endActiveSession(w.userId, companyId, null, id);
  const before = await db
    .select()
    .from(materialInventory)
    .where(eq(materialInventory.materialId, materialId));
  const receipts = await db
    .select()
    .from(materialStockReceipts)
    .where(eq(materialStockReceipts.materialId, materialId));
  await expect(AdminOrderService.deleteOrder(companyId, order.id, w.userId)).rejects.toThrow(
    "order_has_history"
  );
  await expect(AdminSessionService.deleteArchivedSession(companyId, id, w.userId)).rejects.toThrow(
    "order_has_history"
  );
  expect(
    await db.select().from(materialInventory).where(eq(materialInventory.materialId, materialId))
  ).toEqual(before);
  expect(
    await db
      .select()
      .from(materialStockReceipts)
      .where(eq(materialStockReceipts.materialId, materialId))
  ).toEqual(receipts);
  expect(
    await db.select().from(materialStockIssues).where(eq(materialStockIssues.workOrderId, order.id))
  ).toHaveLength(1);
  expect(await db.select().from(workSessions).where(eq(workSessions.id, id))).toHaveLength(1);
});
it("preserves parts, issues and stock even for a pending repair order", async () => {
  const w = await worker();
  const [order] = await db
    .insert(workOrders)
    .values({
      companyId,
      userId: w.userId,
      resourceId: w.resourceId,
      categoryId,
      orderType: "machine_repair",
      status: "PENDING",
      createdById: w.userId,
    })
    .returning();
  const partId = await SparePartService.addPart(companyId, { name: "__ITEST deletion part" });
  await InventoryService.setQuantity(companyId, partId, "10");
  await WorkOrderSparePartService.pickPartFromWarehouse(companyId, w.userId, order.id, {
    partId,
    quantity: "2",
  });
  const before = await InventoryService.getPartInventory(companyId, partId);
  await expect(AdminOrderService.deleteOrder(companyId, order.id, w.userId)).rejects.toThrow(
    "order_has_history"
  );
  await expect(WorkerOrderService.deleteOwnOrder(w.userId, companyId, order.id)).rejects.toThrow(
    "order_has_history"
  );
  expect(await InventoryService.getPartInventory(companyId, partId)).toEqual(before);
  expect(
    await db.select().from(workOrderSpareParts).where(eq(workOrderSpareParts.workOrderId, order.id))
  ).toHaveLength(1);
  expect(
    await db.select().from(stockIssues).where(eq(stockIssues.workOrderId, order.id))
  ).toHaveLength(1);
});
it("serializes deletion versus acceptance without deleting a started session", async () => {
  const w = await worker();
  const [order] = await db
    .insert(workOrders)
    .values({
      companyId,
      userId: w.userId,
      resourceId: w.resourceId,
      categoryId,
      status: "PENDING",
    })
    .returning();
  const results = await Promise.allSettled([
    AdminOrderService.deleteOrder(companyId, order.id),
    WorkerOrderService.acceptOrder(w.userId, companyId, order.id),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const sessions = await db
    .select()
    .from(workSessions)
    .where(eq(workSessions.workOrderId, order.id));
  const orders = await db.select().from(workOrders).where(eq(workOrders.id, order.id));
  expect(sessions.length === 1 ? orders[0]?.status === "IN_PROGRESS" : orders.length === 0).toBe(
    true
  );
});
