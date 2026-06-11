import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { AdminOrderService } from "@/services/AdminOrderService";
import {
  cleanupTestCompany,
  createTestCategory,
  createTestCompany,
  createTestResource,
  createTestUser,
  uniqueTestSlug,
} from "@/test/integrationDb";

describe("AdminOrderService (integracja z bazą)", () => {
  let companyId: number;
  let workerId: number;
  let resourceId: number;
  let categoryId: number;

  function baseOrderData(
    overrides: Partial<typeof workOrders.$inferInsert> = {}
  ): typeof workOrders.$inferInsert {
    return {
      companyId,
      userId: workerId,
      resourceId,
      categoryId,
      taskDescription: `__itest ${uniqueTestSlug()}`,
      status: "PENDING",
      priority: "NORMAL",
      ...overrides,
    };
  }

  /** `createOrder` nie zwraca ID — odnajdujemy wstawione zlecenie po unikalnym opisie. */
  async function findOrderIdByDescription(taskDescription: string): Promise<number> {
    const [row] = await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(
        and(eq(workOrders.companyId, companyId), eq(workOrders.taskDescription, taskDescription))
      )
      .limit(1);
    expect(row).toBeDefined();
    return row.id;
  }

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const [worker, resource, category] = await Promise.all([
      createTestUser(companyId),
      createTestResource(companyId),
      createTestCategory(companyId),
    ]);
    workerId = worker.id;
    resourceId = resource.id;
    categoryId = category.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("tworzy zlecenie i pokazuje je w kolejce dyspozycji (PENDING)", async () => {
    const data = baseOrderData({ priority: "URGENT" });
    await AdminOrderService.createOrder(data);

    const queue = await AdminOrderService.getActiveWorkOrders(companyId);
    const created = queue.find((o) => o.taskDescription === data.taskDescription);
    expect(created).toBeDefined();
    expect(created?.status).toBe("PENDING");
    expect(created?.priority).toBe("URGENT");
    expect(created?.userId).toBe(workerId);
    expect(created?.resourceId).toBe(resourceId);
  });

  it("CHECK priorytetu odrzuca wartość spoza URGENT|HIGH|NORMAL|LOW", async () => {
    const data = baseOrderData({ priority: "INVALID" });
    // Drizzle opakowuje błąd PG w DrizzleQueryError — nazwa constraintu jest w `cause`.
    const err = await AdminOrderService.createOrder(data).then(
      () => null,
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).cause)).toMatch(/work_orders_priority_chk/);

    const [leftover] = await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.companyId, companyId),
          eq(workOrders.taskDescription, data.taskDescription as string)
        )
      )
      .limit(1);
    expect(leftover).toBeUndefined();
  });

  it("aktualizuje pola oczekującego zlecenia i zmienia status", async () => {
    const data = baseOrderData();
    await AdminOrderService.createOrder(data);
    const orderId = await findOrderIdByDescription(data.taskDescription as string);

    await AdminOrderService.updateOrder(companyId, orderId, {
      priority: "HIGH",
      taskDescription: `${data.taskDescription} (po edycji)`,
    });
    await AdminOrderService.updateOrder(companyId, orderId, { status: "CANCELLED" });

    const [row] = await db
      .select({
        status: workOrders.status,
        priority: workOrders.priority,
        taskDescription: workOrders.taskDescription,
      })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)));
    expect(row.status).toBe("CANCELLED");
    expect(row.priority).toBe("HIGH");
    expect(row.taskDescription).toBe(`${data.taskDescription} (po edycji)`);
  });

  it("odrzuca edycję zlecenia w statusie innym niż PENDING (not_pending)", async () => {
    const data = baseOrderData({ status: "COMPLETED" });
    await AdminOrderService.createOrder(data);
    const orderId = await findOrderIdByDescription(data.taskDescription as string);

    await expect(
      AdminOrderService.updateOrder(companyId, orderId, { priority: "LOW" })
    ).rejects.toThrow("not_pending");
  });

  it("usuwa zlecenie; ponowne usunięcie i edycja zwracają not_found", async () => {
    const data = baseOrderData();
    await AdminOrderService.createOrder(data);
    const orderId = await findOrderIdByDescription(data.taskDescription as string);

    await AdminOrderService.deleteOrder(companyId, orderId, workerId);

    const [row] = await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)))
      .limit(1);
    expect(row).toBeUndefined();

    await expect(AdminOrderService.deleteOrder(companyId, orderId, workerId)).rejects.toThrow(
      "not_found"
    );
    await expect(
      AdminOrderService.updateOrder(companyId, orderId, { priority: "LOW" })
    ).rejects.toThrow("not_found");
  });

  it("odrzuca zlecenie dla użytkownika innej firmy (invalid_user)", async () => {
    const otherCompany = await createTestCompany();
    try {
      const foreignWorker = await createTestUser(otherCompany.id);
      await expect(
        AdminOrderService.createOrder(baseOrderData({ userId: foreignWorker.id }))
      ).rejects.toThrow("invalid_user");
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });

  it("odrzuca delegację aktora bez zasięgu organizacyjnego (forbidden)", async () => {
    const targetWorker = await createTestUser(companyId);
    await expect(
      AdminOrderService.createOrder(baseOrderData({ userId: targetWorker.id }), {
        userId: workerId,
        role: "worker",
      })
    ).rejects.toThrow("forbidden");
  });
});
