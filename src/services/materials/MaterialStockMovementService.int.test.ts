import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MaterialInventoryService } from "@/services/materials/MaterialInventoryService";
import { MaterialStockMovementService } from "@/services/materials/MaterialStockMovementService";
import { WorkerSessionService } from "@/services/WorkerSessionService";
import {
  cleanupTestCompany,
  createTestCategory,
  createTestCompany,
  createTestMaterial,
  createTestResource,
  createTestUser,
} from "@/test/integrationDb";

async function readStock(companyId: number, materialId: number): Promise<string> {
  const rows = await MaterialInventoryService.getInventory(companyId, { materialId });
  return rows[0]?.quantity ?? "0";
}

describe("MaterialStockMovementService (integracja z bazą)", () => {
  let companyId: number;
  let userId: number;
  let materialId: number;
  let workSessionId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const user = await createTestUser(companyId);
    userId = user.id;
    const [material, resource, category] = await Promise.all([
      createTestMaterial(companyId, { name: "__ITEST piasek" }),
      createTestResource(companyId),
      createTestCategory(companyId),
    ]);
    materialId = material.id;

    // Sesja robocza do testu wydania/zwrotu powiązanego z sesją.
    const session = await WorkerSessionService.createWizardSession(userId, companyId, {
      resourceId: resource.id,
      categoryId: category.id,
      taskDescription: "__ITEST sesja magazynowa",
    });
    workSessionId = session.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("przyjęcie materiału zwiększa stan: 0 → 10.50", async () => {
    const receipt = await MaterialStockMovementService.addReceipt(companyId, userId, {
      materialId,
      quantity: "10.50",
      unitPrice: "3.75",
      invoiceNumber: "FV/ITEST/M1",
    });
    expect(receipt.id).toBeGreaterThan(0);
    expect(receipt.quantity).toBe("10.50");
    expect(receipt.unitPrice).toBe("3.75");
    expect(await readStock(companyId, materialId)).toBe("10.50");
  });

  it("wydanie materiału zmniejsza stan: 10.50 − 3.25 = 7.25", async () => {
    const issue = await MaterialStockMovementService.addIssue(companyId, userId, {
      materialId,
      quantity: "3.25",
      workOrderId: null,
      issuedTo: userId,
      notes: "__ITEST wydanie materiału",
    });
    expect(issue.quantity).toBe("3.25");
    expect(await readStock(companyId, materialId)).toBe("7.25");
  });

  it("wydanie ponad stan rzuca insufficient_stock i nie zmienia stanu", async () => {
    await expect(
      MaterialStockMovementService.addIssue(companyId, userId, {
        materialId,
        quantity: "999.00",
        workOrderId: null,
        issuedTo: null,
        notes: null,
      })
    ).rejects.toThrow("insufficient_stock");
    expect(await readStock(companyId, materialId)).toBe("7.25");
  });

  it("odrzuca nieprawidłową ilość (invalid_quantity) dla przyjęcia i wydania", async () => {
    await expect(
      MaterialStockMovementService.addReceipt(companyId, userId, { materialId, quantity: "0" })
    ).rejects.toThrow("invalid_quantity");
    await expect(
      MaterialStockMovementService.addIssue(companyId, userId, {
        materialId,
        quantity: "-2",
        workOrderId: null,
        issuedTo: null,
        notes: null,
      })
    ).rejects.toThrow("invalid_quantity");
    expect(await readStock(companyId, materialId)).toBe("7.25");
  });

  it("wydanie na sesję i zwrot z sesji przywraca stan: 7.25 − 2.00 + 2.00 = 7.25", async () => {
    await MaterialStockMovementService.issueForWorkSession(companyId, userId, {
      workSessionId,
      workOrderId: null,
      materialId,
      quantity: "2.00",
      issuedTo: userId,
    });
    expect(await readStock(companyId, materialId)).toBe("5.25");

    const receipt = await MaterialStockMovementService.returnForWorkSession(companyId, userId, {
      workSessionId,
      materialId,
      quantity: "2.00",
      workOrderId: null,
    });
    expect(receipt.workSessionId).toBe(workSessionId);
    expect(receipt.notes).toContain("Zwrot");
    expect(await readStock(companyId, materialId)).toBe("7.25");
  });

  it("historia ruchów: getReceipts i getIssues zwracają ruchy z nazwą materiału", async () => {
    const receipts = await MaterialStockMovementService.getReceipts(companyId);
    expect(receipts).toHaveLength(2); // przyjęcie + zwrot z sesji
    expect(receipts.every((r) => r.materialName === "__ITEST piasek")).toBe(true);

    const issues = await MaterialStockMovementService.getIssues(companyId);
    expect(issues).toHaveLength(2); // wydanie zwykłe + wydanie na sesję
    expect(issues.every((i) => i.companyId === companyId && i.materialId === materialId)).toBe(
      true
    );
    const quantities = issues.map((i) => i.quantity).sort();
    expect(quantities).toEqual(["2.00", "3.25"]);
  });
});
