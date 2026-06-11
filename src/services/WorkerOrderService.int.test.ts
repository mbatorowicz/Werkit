import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workOrders, workSessions } from "@/db/schema";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import { WorkerSessionService } from "@/services/WorkerSessionService";
import {
  cleanupTestCompany,
  createTestCategory,
  createTestCompany,
  createTestResource,
  createTestUser,
} from "@/test/integrationDb";

describe("WorkerOrderService (integracja z bazą)", () => {
  let companyId: number;
  let workerId: number;
  let workerBezUprawnienId: number;
  let resourceId: number;
  let categoryId: number;

  /** Body zlecenia własnego — kategoria z fixtures wymaga opisu zadania (reqTaskDescription). */
  function ownOrderBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      categoryId,
      resourceId,
      taskDescription: "__itest zlecenie własne",
      priority: "HIGH",
      ...overrides,
    };
  }

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const [worker, workerBezUprawnien, resource, category] = await Promise.all([
      createTestUser(companyId, { canCreateOwnOrders: true }),
      createTestUser(companyId, { canCreateOwnOrders: false }),
      createTestResource(companyId),
      createTestCategory(companyId),
    ]);
    workerId = worker.id;
    workerBezUprawnienId = workerBezUprawnien.id;
    resourceId = resource.id;
    categoryId = category.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("tworzy zlecenie własne i pokazuje je na liście oczekujących", async () => {
    const orderId = await WorkerOrderService.createOwnOrder(workerId, companyId, ownOrderBody());
    expect(orderId).toBeGreaterThan(0);

    const pending = await WorkerOrderService.getPendingOrders(workerId, companyId);
    const created = pending.find((o) => o.id === orderId);
    expect(created).toBeDefined();
    expect(created?.priority).toBe("HIGH");
    expect(created?.taskDescription).toBe("__itest zlecenie własne");
    expect(created?.resourceId).toBe(resourceId);
    expect(created?.hasPhotos).toBe(false);
    expect(created?.hasNotes).toBe(false);

    await WorkerOrderService.deleteOwnOrder(workerId, companyId, orderId);
  });

  it("odrzuca zlecenie własne bez wymaganych pól (missing_fields)", async () => {
    await expect(
      WorkerOrderService.createOwnOrder(workerId, companyId, ownOrderBody({ resourceId: null }))
    ).rejects.toThrow("missing_fields");
  });

  it("odrzuca zlecenie własne pracownika bez uprawnienia (forbidden)", async () => {
    await expect(
      WorkerOrderService.createOwnOrder(workerBezUprawnienId, companyId, ownOrderBody())
    ).rejects.toThrow("forbidden");
  });

  it("odrzuca zasób innej firmy (cross_tenant)", async () => {
    const otherCompany = await createTestCompany();
    try {
      const foreignResource = await createTestResource(otherCompany.id);
      await expect(
        WorkerOrderService.createOwnOrder(
          workerId,
          companyId,
          ownOrderBody({ resourceId: foreignResource.id })
        )
      ).rejects.toMatchObject({ code: "cross_tenant" });
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });

  it("akceptacja zlecenia tworzy sesję i przestawia zlecenie na IN_PROGRESS", async () => {
    const orderId = await WorkerOrderService.createOwnOrder(workerId, companyId, ownOrderBody());

    const sessionId = await WorkerOrderService.acceptOrder(workerId, companyId, orderId);
    expect(sessionId).toBeGreaterThan(0);

    const [orderRow] = await db
      .select({ status: workOrders.status })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)));
    expect(orderRow.status).toBe("IN_PROGRESS");

    const [sessionRow] = await db
      .select({
        status: workSessions.status,
        workOrderId: workSessions.workOrderId,
        userId: workSessions.userId,
        taskDescription: workSessions.taskDescription,
      })
      .from(workSessions)
      .where(and(eq(workSessions.id, sessionId), eq(workSessions.companyId, companyId)));
    expect(sessionRow.status).toBe("IN_PROGRESS");
    expect(sessionRow.workOrderId).toBe(orderId);
    expect(sessionRow.userId).toBe(workerId);
    expect(sessionRow.taskDescription).toBe("__itest zlecenie własne");

    await WorkerSessionService.endActiveSession(workerId, companyId);
  });

  it("odrzuca akceptację drugiego zlecenia przy aktywnej sesji (session_active)", async () => {
    const orderAId = await WorkerOrderService.createOwnOrder(workerId, companyId, ownOrderBody());
    const orderBId = await WorkerOrderService.createOwnOrder(workerId, companyId, ownOrderBody());

    await WorkerOrderService.acceptOrder(workerId, companyId, orderAId);
    await expect(WorkerOrderService.acceptOrder(workerId, companyId, orderBId)).rejects.toThrow(
      "session_active"
    );

    await WorkerSessionService.endActiveSession(workerId, companyId);
  });

  it("odrzuca akceptację zlecenia przypisanego do innego pracownika (order_not_found)", async () => {
    const orderId = await WorkerOrderService.createOwnOrder(workerId, companyId, ownOrderBody());
    await expect(
      WorkerOrderService.acceptOrder(workerBezUprawnienId, companyId, orderId)
    ).rejects.toThrow("order_not_found");
  });

  it("edycja i usunięcie własnego oczekującego zlecenia", async () => {
    const orderId = await WorkerOrderService.createOwnOrder(workerId, companyId, ownOrderBody());

    await WorkerOrderService.updateOwnOrder(
      workerId,
      companyId,
      orderId,
      ownOrderBody({ priority: "LOW", taskDescription: "__itest po edycji" })
    );

    const updated = await WorkerOrderService.getOwnPendingOrder(workerId, companyId, orderId);
    expect(updated.priority).toBe("LOW");
    expect(updated.taskDescription).toBe("__itest po edycji");

    await WorkerOrderService.deleteOwnOrder(workerId, companyId, orderId);
    await expect(
      WorkerOrderService.getOwnPendingOrder(workerId, companyId, orderId)
    ).rejects.toThrow("order_not_found");
  });
});
