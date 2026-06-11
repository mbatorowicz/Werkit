import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InventoryService } from "@/services/dur/InventoryService";
import { SparePartService } from "@/services/dur/SparePartService";
import { StockMovementService } from "@/services/dur/StockMovementService";
import { cleanupTestCompany, createTestCompany, createTestUser } from "@/test/integrationDb";

async function readStock(companyId: number, partId: number): Promise<string> {
  const inventory = await InventoryService.getPartInventory(companyId, partId);
  return inventory?.quantity ?? "0";
}

describe("StockMovementService (integracja z bazą)", () => {
  let companyId: number;
  let userId: number;
  let partId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const user = await createTestUser(companyId);
    userId = user.id;
    partId = await SparePartService.addPart(companyId, { name: "__ITEST część PZ/WZ" });
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("przyjęcie (PZ) zwiększa stan: 0 → 10.50", async () => {
    const receipt = await StockMovementService.addReceipt(companyId, userId, {
      partId,
      quantity: "10.50",
      unitPrice: "4.20",
      invoiceNumber: "FV/ITEST/1",
    });
    expect(receipt.id).toBeGreaterThan(0);
    expect(receipt.quantity).toBe("10.50");
    expect(await readStock(companyId, partId)).toBe("10.50");
  });

  it("wydanie (WZ) zmniejsza stan: 10.50 − 3.25 = 7.25", async () => {
    const issue = await StockMovementService.addIssue(companyId, userId, {
      partId,
      quantity: "3.25",
      workOrderId: null,
      issuedTo: userId,
      notes: "__ITEST wydanie",
    });
    expect(issue.quantity).toBe("3.25");
    expect(await readStock(companyId, partId)).toBe("7.25");
  });

  it("wydanie ponad stan rzuca insufficient_stock i nie zmienia stanu", async () => {
    await expect(
      StockMovementService.addIssue(companyId, userId, {
        partId,
        quantity: "100.00",
        workOrderId: null,
        issuedTo: userId,
        notes: null,
      })
    ).rejects.toThrow("insufficient_stock");
    expect(await readStock(companyId, partId)).toBe("7.25");
  });

  it("odrzuca nieprawidłową ilość (invalid_quantity) dla przyjęcia i wydania", async () => {
    await expect(
      StockMovementService.addReceipt(companyId, userId, { partId, quantity: "0" })
    ).rejects.toThrow("invalid_quantity");
    await expect(
      StockMovementService.addReceipt(companyId, userId, { partId, quantity: "abc" })
    ).rejects.toThrow("invalid_quantity");
    await expect(
      StockMovementService.addIssue(companyId, userId, {
        partId,
        quantity: "-1",
        workOrderId: null,
        issuedTo: null,
        notes: null,
      })
    ).rejects.toThrow("invalid_quantity");
    expect(await readStock(companyId, partId)).toBe("7.25");
  });

  it("wydanie do zera: 7.25 − 7.25 = 0.00, kolejne wydanie rzuca insufficient_stock", async () => {
    await StockMovementService.addIssue(companyId, userId, {
      partId,
      quantity: "7.25",
      workOrderId: null,
      issuedTo: userId,
      notes: null,
    });
    expect(await readStock(companyId, partId)).toBe("0.00");

    await expect(
      StockMovementService.addIssue(companyId, userId, {
        partId,
        quantity: "0.01",
        workOrderId: null,
        issuedTo: null,
        notes: null,
      })
    ).rejects.toThrow("insufficient_stock");
  });

  it("historia ruchów: getReceipts i getIssues zwracają ruchy z danymi części", async () => {
    const receipts = await StockMovementService.getReceipts(companyId);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].partId).toBe(partId);
    expect(receipts[0].quantity).toBe("10.50");
    expect(receipts[0].partName).toBe("__ITEST część PZ/WZ");
    expect(receipts[0].invoiceNumber).toBe("FV/ITEST/1");

    const issues = await StockMovementService.getIssues(companyId);
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.partId === partId && i.companyId === companyId)).toBe(true);
    const quantities = issues.map((i) => i.quantity).sort();
    expect(quantities).toEqual(["3.25", "7.25"]);
  });
});
