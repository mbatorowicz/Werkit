import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WorkerSessionService } from "@/services/WorkerSessionService";
import {
  cleanupTestCompany,
  createTestCategory,
  createTestCompany,
  createTestResource,
  createTestUser,
} from "@/test/integrationDb";

describe("WorkerSessionService (integracja z bazą)", () => {
  let companyId: number;
  let userId: number;
  let resourceId: number;
  let categoryId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const [user, resource, category] = await Promise.all([
      createTestUser(companyId),
      createTestResource(companyId),
      createTestCategory(companyId),
    ]);
    userId = user.id;
    resourceId = resource.id;
    categoryId = category.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("bez aktywnej sesji zwraca null session", async () => {
    const result = await WorkerSessionService.getActiveSessionWithDetails(userId, companyId);
    expect(result.session).toBeNull();
  });

  it("pełny cykl: start sesji wizardem -> sesja aktywna -> zakończenie", async () => {
    const session = await WorkerSessionService.createWizardSession(userId, companyId, {
      resourceId,
      categoryId,
      taskDescription: "Test integracyjny — przebieg sesji",
    });
    expect(session.id).toBeGreaterThan(0);
    expect(session.status).toBe("IN_PROGRESS");
    expect(session.companyId).toBe(companyId);

    const active = await WorkerSessionService.getActiveSessionWithDetails(userId, companyId);
    expect(active.session?.id).toBe(session.id);

    const ended = await WorkerSessionService.endActiveSession(userId, companyId);
    expect(ended).toBe(true);

    const afterEnd = await WorkerSessionService.getActiveSessionWithDetails(userId, companyId);
    expect(afterEnd.session).toBeNull();
  });

  it("odrzuca start drugiej sesji gdy jedna już trwa (session_active)", async () => {
    await WorkerSessionService.createWizardSession(userId, companyId, {
      resourceId,
      categoryId,
    });
    await expect(
      WorkerSessionService.createWizardSession(userId, companyId, { resourceId, categoryId })
    ).rejects.toThrow("session_active");
    await WorkerSessionService.endActiveSession(userId, companyId);
  });

  it("odrzuca zasób innej firmy (izolacja multi-tenant)", async () => {
    const otherCompany = await createTestCompany();
    try {
      const foreignResource = await createTestResource(otherCompany.id);
      await expect(
        WorkerSessionService.createWizardSession(userId, companyId, {
          resourceId: foreignResource.id,
          categoryId,
        })
      ).rejects.toThrow();
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });

  it("zakończenie bez aktywnej sesji rzuca no_active_session", async () => {
    await expect(WorkerSessionService.endActiveSession(userId, companyId)).rejects.toThrow(
      "no_active_session"
    );
  });
});
