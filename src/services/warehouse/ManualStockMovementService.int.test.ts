import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stockMovementOperations } from "@/db/schema";
import { ManualStockMovementService as Manual } from "./ManualStockMovementService";
import { StockMovementService as Parts } from "@/services/dur/StockMovementService";
import { MaterialStockMovementService as Materials } from "@/services/materials/MaterialStockMovementService";
import { SparePartService } from "@/services/dur/SparePartService";
import {
  cleanupTestCompany,
  createTestCompany,
  createTestUser,
  createTestMaterial,
} from "@/test/integrationDb";
describe("manual PZ/WZ durable receipts", () => {
  let companyId: number, userId: number, otherUser: number, partId: number, materialId: number;
  beforeAll(async () => {
    companyId = (await createTestCompany()).id;
    userId = (await createTestUser(companyId, { role: "admin" })).id;
    otherUser = (await createTestUser(companyId, { role: "admin" })).id;
    partId = await SparePartService.addPart(companyId, { name: "__ITEST manual" });
    materialId = (await createTestMaterial(companyId)).id;
  });
  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });
  for (const kind of ["dur", "materials"] as const) {
    it(`${kind}: concurrent PZ/WZ, replay after stock changed, rollback and intent conflicts`, async () => {
      const input = kind === "dur" ? { partId, quantity: "10" } : { materialId, quantity: "10" };
      const receiptKey = randomUUID();
      const receive = (key = receiptKey, user = userId, quantity = "10") => {
        const body = { ...input, quantity };
        return Manual.execute(companyId, user, key, `${kind}:receipts`, body, (tx) =>
          kind === "dur"
            ? Parts.addReceipt(companyId, user, { partId, quantity }, tx)
            : Materials.addReceipt(companyId, user, { materialId, quantity }, tx)
        );
      };
      const results = await Promise.all(Array.from({ length: 12 }, () => receive()));
      for (const result of results) expect(result).toEqual(results[0]);
      const issueKey = randomUUID();
      const issueBody = { ...input, quantity: "10" };
      const issue = () =>
        Manual.execute(companyId, userId, issueKey, `${kind}:issues`, issueBody, (tx) =>
          kind === "dur"
            ? Parts.addIssue(companyId, userId, { partId, quantity: "10" }, tx)
            : Materials.addIssue(companyId, userId, { materialId, quantity: "10" }, tx)
        );
      const issues = await Promise.all(Array.from({ length: 12 }, issue));
      for (const result of issues) expect(result).toEqual(issues[0]);
      // No stock remains, yet replay must return the original successful result.
      expect(await issue()).toEqual(issues[0]);
      expect(await receive()).toEqual(results[0]);
      const docs =
        kind === "dur"
          ? await Parts.getReceipts(companyId)
          : await Materials.getReceipts(companyId);
      expect(docs).toHaveLength(1);
      expect(
        kind === "dur" ? await Parts.getIssues(companyId) : await Materials.getIssues(companyId)
      ).toHaveLength(1);
      await expect(receive(receiptKey, otherUser)).rejects.toMatchObject({
        code: "operation_conflict",
        status: 409,
      });
      await expect(receive(receiptKey, userId, "11")).rejects.toMatchObject({
        code: "operation_conflict",
      });
      await expect(
        Manual.execute(companyId, userId, receiptKey, `${kind}:issues`, input, async () => {
          throw Error("must not run");
        })
      ).rejects.toMatchObject({ code: "operation_conflict" });
      const failedKey = randomUUID();
      await expect(
        Manual.execute(companyId, userId, failedKey, `${kind}:receipts`, input, async (tx) => {
          if (kind === "dur")
            await Parts.addReceipt(companyId, userId, { partId, quantity: "10" }, tx);
          else await Materials.addReceipt(companyId, userId, { materialId, quantity: "10" }, tx);
          throw Error("after document and stock mutation");
        })
      ).rejects.toThrow("after document");
      expect(
        await db
          .select()
          .from(stockMovementOperations)
          .where(eq(stockMovementOperations.id, failedKey))
      ).toHaveLength(0);
      expect(
        kind === "dur" ? await Parts.getReceipts(companyId) : await Materials.getReceipts(companyId)
      ).toHaveLength(1);
      await receive(failedKey); // rolled-back intent can execute once on retry
    });
  }
});
