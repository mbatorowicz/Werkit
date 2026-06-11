import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { WorkerDelegationService } from "@/services/WorkerDelegationService";
import {
  cleanupTestCompany,
  createTestCategory,
  createTestCompany,
  createTestResource,
  createTestUser,
} from "@/test/integrationDb";

describe("WorkerDelegationService (integracja z bazą)", () => {
  let companyId: number;
  let adminId: number;
  let targetWorkerId: number;
  let plainWorkerId: number;
  let resourceId: number;
  let categoryId: number;

  /** Body delegacji — kategoria z fixtures wymaga opisu zadania (reqTaskDescription). */
  function delegationBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      userId: targetWorkerId,
      resourceId,
      categoryId,
      taskDescription: "__itest delegacja",
      priority: "URGENT",
      ...overrides,
    };
  }

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const [admin, targetWorker, plainWorker, resource, category] = await Promise.all([
      createTestUser(companyId, { role: "admin" }),
      createTestUser(companyId),
      createTestUser(companyId),
      createTestResource(companyId),
      createTestCategory(companyId),
    ]);
    adminId = admin.id;
    targetWorkerId = targetWorker.id;
    plainWorkerId = plainWorker.id;
    resourceId = resource.id;
    categoryId = category.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("admin deleguje zlecenie — powstaje PENDING dla adresata z createdById aktora", async () => {
    const orderId = await WorkerDelegationService.createDelegatedOrder(
      adminId,
      "admin",
      companyId,
      delegationBody()
    );
    expect(orderId).toBeGreaterThan(0);

    const [row] = await db
      .select({
        userId: workOrders.userId,
        createdById: workOrders.createdById,
        status: workOrders.status,
        priority: workOrders.priority,
        taskDescription: workOrders.taskDescription,
        resourceId: workOrders.resourceId,
      })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)));
    expect(row.userId).toBe(targetWorkerId);
    expect(row.createdById).toBe(adminId);
    expect(row.status).toBe("PENDING");
    expect(row.priority).toBe("URGENT");
    expect(row.taskDescription).toBe("__itest delegacja");
    expect(row.resourceId).toBe(resourceId);
  });

  it("odrzuca delegację bez userId (missing_fields)", async () => {
    await expect(
      WorkerDelegationService.createDelegatedOrder(
        adminId,
        "admin",
        companyId,
        delegationBody({ userId: undefined })
      )
    ).rejects.toThrow("missing_fields");
  });

  it("odrzuca delegację z nieliczbowym categoryId (missing_fields)", async () => {
    await expect(
      WorkerDelegationService.createDelegatedOrder(
        adminId,
        "admin",
        companyId,
        delegationBody({ categoryId: "abc" })
      )
    ).rejects.toThrow("missing_fields");
  });

  it("odrzuca delegację z niepoprawną datą terminu (invalid_payload)", async () => {
    await expect(
      WorkerDelegationService.createDelegatedOrder(
        adminId,
        "admin",
        companyId,
        delegationBody({ dueDate: "to-nie-jest-data" })
      )
    ).rejects.toThrow("invalid_payload");
  });

  it("odrzuca delegację pracownika bez praw delegowania (forbidden)", async () => {
    await expect(
      WorkerDelegationService.createDelegatedOrder(
        plainWorkerId,
        "worker",
        companyId,
        delegationBody()
      )
    ).rejects.toThrow("forbidden");
  });

  it("odrzuca delegację do pracownika innej firmy (invalid_user)", async () => {
    const otherCompany = await createTestCompany();
    try {
      const foreignWorker = await createTestUser(otherCompany.id);
      await expect(
        WorkerDelegationService.createDelegatedOrder(
          adminId,
          "admin",
          companyId,
          delegationBody({ userId: foreignWorker.id })
        )
      ).rejects.toThrow("invalid_user");
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });

  it("odrzuca delegację bez opisu gdy kategoria go wymaga (missing_task_description)", async () => {
    await expect(
      WorkerDelegationService.createDelegatedOrder(
        adminId,
        "admin",
        companyId,
        delegationBody({ taskDescription: undefined })
      )
    ).rejects.toThrow("missing_task_description");
  });
});
