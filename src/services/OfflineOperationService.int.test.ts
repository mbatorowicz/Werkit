import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessionNotes, offlineOperations } from "@/db/schema";
import {
  createTestCompany,
  createTestUser,
  createTestResource,
  createTestCategory,
  cleanupTestCompany,
} from "@/test/integrationDb";
import { WorkerSessionService } from "./WorkerSessionService";
import { OfflineOperationService } from "./OfflineOperationService";

describe("offline operations", () => {
  let companyId: number, userId: number, sessionId: number;
  beforeAll(async () => {
    companyId = (await createTestCompany()).id;
    userId = (await createTestUser(companyId)).id;
    const resourceId = (await createTestResource(companyId)).id;
    const categoryId = (await createTestCategory(companyId)).id;
    sessionId = (
      await WorkerSessionService.createWizardSession(userId, companyId, { resourceId, categoryId })
    ).id;
  });
  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });
  it("commits one note for concurrent requests and lost-response retry", async () => {
    const action = {
      operationId: randomUUID(),
      type: "save_note",
      payload: { sessionId, note: "once" },
    };
    const results = await Promise.all(
      [1, 2].map(() => OfflineOperationService.execute(userId, companyId, action))
    );
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect((await OfflineOperationService.execute(userId, companyId, action)).replayed).toBe(true);
    expect(
      await db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, sessionId))
    ).toHaveLength(1);
    await expect(
      OfflineOperationService.execute(userId, companyId, {
        ...action,
        payload: { sessionId, note: "changed" },
      })
    ).rejects.toThrow("offline_conflict");
  });
  it("does not record failed operations", async () => {
    const operationId = randomUUID();
    await expect(
      OfflineOperationService.execute(userId, companyId, {
        operationId,
        type: "edit_note",
        payload: { sessionId, noteId: -1, note: "missing" },
      })
    ).rejects.toThrow();
    expect(
      await db.select().from(offlineOperations).where(eq(offlineOperations.id, operationId))
    ).toHaveLength(0);
  });
  it("rejects another user and replays end after the session is closed", async () => {
    const operationId = randomUUID();
    const other = await createTestUser(companyId);
    const action = {
      operationId,
      type: "end_session",
      payload: { sessionId, occurredAt: new Date().toISOString() },
    };
    await expect(OfflineOperationService.execute(other.id, companyId, action)).rejects.toThrow(
      "offline_conflict"
    );
    await OfflineOperationService.execute(userId, companyId, action);
    expect((await OfflineOperationService.execute(userId, companyId, action)).replayed).toBe(true);
  });
});
