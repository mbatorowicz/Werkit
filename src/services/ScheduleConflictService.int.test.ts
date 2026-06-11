import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { ScheduleConflictService } from "@/services/ScheduleConflictService";
import { WorkerSessionService } from "@/services/WorkerSessionService";
import {
  cleanupTestCompany,
  createTestCategory,
  createTestCompany,
  createTestResource,
  createTestUser,
} from "@/test/integrationDb";

/**
 * Testy współdzielą stan w obrębie pliku: w beforeAll startuje aktywna sesja
 * użytkownika B na zasobie; test „po zakończeniu sesji" kończy ją —
 * kolejność `it` ma znaczenie.
 */
describe("ScheduleConflictService (integracja z bazą)", () => {
  let companyId: number;
  let userAId: number;
  let userBId: number;
  let resourceId: number;
  let secondResourceId: number;
  let categoryId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const [userA, userB, resource, secondResource, category] = await Promise.all([
      createTestUser(companyId),
      createTestUser(companyId),
      createTestResource(companyId),
      createTestResource(companyId),
      createTestCategory(companyId),
    ]);
    userAId = userA.id;
    userBId = userB.id;
    resourceId = resource.id;
    secondResourceId = secondResource.id;
    categoryId = category.id;

    // Aktywna sesja użytkownika B na zasobie — tło dla testów konfliktu.
    await WorkerSessionService.createWizardSession(userBId, companyId, {
      resourceId,
      categoryId,
      taskDescription: "__itest sesja blokująca zasób",
    });
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("hasActiveWorkerSession: wykrywa aktywną sesję tylko właściwego pracownika", async () => {
    expect(await ScheduleConflictService.hasActiveWorkerSession(companyId, userBId)).toBe(true);
    expect(await ScheduleConflictService.hasActiveWorkerSession(companyId, userAId)).toBe(false);
  });

  it("hasActiveResourceSession: zasób zajęty przez innego użytkownika", async () => {
    expect(await ScheduleConflictService.hasActiveResourceSession(companyId, resourceId)).toBe(
      true
    );
    expect(
      await ScheduleConflictService.hasActiveResourceSession(companyId, resourceId, userAId)
    ).toBe(true);
    // Sesja należy do B — z jego perspektywy zasób nie jest zajęty przez kogoś innego.
    expect(
      await ScheduleConflictService.hasActiveResourceSession(companyId, resourceId, userBId)
    ).toBe(false);
  });

  it("assertNoScheduleConflict bez terminu rzuca resource_busy na zajętym zasobie", async () => {
    await expect(
      ScheduleConflictService.assertNoScheduleConflict(companyId, {
        userId: userAId,
        resourceId,
        dueDate: null,
        durationHours: null,
      })
    ).rejects.toThrow("resource_busy");
  });

  it("findResourceBusyConflicts: konflikt z sesją innego użytkownika, brak dla właściciela", async () => {
    const conflictsForA = await ScheduleConflictService.findResourceBusyConflicts(
      companyId,
      userAId,
      resourceId
    );
    expect(conflictsForA).toHaveLength(1);
    expect(conflictsForA[0].kind).toBe("resource");
    expect(conflictsForA[0].source).toBe("session");
    expect(conflictsForA[0].taskLabel).toBe("__itest sesja blokująca zasób");

    const conflictsForB = await ScheduleConflictService.findResourceBusyConflicts(
      companyId,
      userBId,
      resourceId
    );
    expect(conflictsForB).toHaveLength(0);
  });

  it("po zakończeniu sesji zasób przestaje być zajęty", async () => {
    await WorkerSessionService.endActiveSession(userBId, companyId);

    await expect(
      ScheduleConflictService.assertNoScheduleConflict(companyId, {
        userId: userAId,
        resourceId,
        dueDate: null,
        durationHours: null,
      })
    ).resolves.toEqual({ ok: true });
  });

  it("nakładający się termin zlecenia rzuca schedule_conflict; excludeOrderId go pomija", async () => {
    const dueDate = new Date(Date.now() + 24 * 3600 * 1000);
    const [order] = await db
      .insert(workOrders)
      .values({
        companyId,
        userId: userAId,
        resourceId: secondResourceId,
        categoryId,
        taskDescription: "__itest zlecenie z terminem",
        status: "PENDING",
        expectedDurationHours: "2.00",
        dueDate,
      })
      .returning({ id: workOrders.id });

    const overlapping = {
      userId: userAId,
      resourceId: secondResourceId,
      dueDate: new Date(dueDate.getTime() + 3600 * 1000),
      durationHours: 1,
    };

    await expect(
      ScheduleConflictService.assertNoScheduleConflict(companyId, overlapping)
    ).rejects.toThrow("schedule_conflict");

    await expect(
      ScheduleConflictService.assertNoScheduleConflict(companyId, {
        ...overlapping,
        excludeOrderId: order.id,
      })
    ).resolves.toEqual({ ok: true });
  });
});
