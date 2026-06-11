import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { stockIssues, stockReceipts, workOrders } from "@/db/schema";
import { InventoryService } from "@/services/dur/InventoryService";
import { SparePartService } from "@/services/dur/SparePartService";
import { StockMovementService } from "@/services/dur/StockMovementService";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";
import {
  cleanupTestCompany,
  createTestCompany,
  createTestResource,
  createTestUser,
} from "@/test/integrationDb";

/** Lokalny helper — zlecenie naprawcze (machine_repair) we własnej firmie testowej. */
async function createRepairOrder(
  companyId: number,
  userId: number,
  resourceId: number
): Promise<{ id: number }> {
  const [row] = await db
    .insert(workOrders)
    .values({
      companyId,
      userId,
      resourceId,
      orderType: "machine_repair",
      taskDescription: "__ITEST naprawa",
      repairDescription: "__ITEST usterka",
    })
    .returning({ id: workOrders.id });
  return row;
}

async function readStock(companyId: number, partId: number): Promise<string> {
  const inventory = await InventoryService.getPartInventory(companyId, partId);
  return inventory?.quantity ?? "0";
}

describe("WorkOrderSparePartService (integracja z bazą)", () => {
  let companyId: number;
  let userId: number;
  let workOrderId: number;
  let partId: number;
  let lineId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const user = await createTestUser(companyId);
    userId = user.id;
    const resource = await createTestResource(companyId);
    const order = await createRepairOrder(companyId, userId, resource.id);
    workOrderId = order.id;
    partId = await SparePartService.addPart(companyId, { name: "__ITEST część do naprawy" });
    await InventoryService.setQuantity(companyId, partId, "10.00");
  });

  afterAll(async () => {
    // Pre-cleanup TYLKO własnych ruchów magazynowych: kasacja usera kaskaduje kilka
    // SET NULL na tych samych wierszach stock_issues, co wyzwala ponowną walidację FK
    // work_order_id w tej samej transakcji (znany corner-case Postgresa).
    await db.delete(stockIssues).where(eq(stockIssues.companyId, companyId));
    await db.delete(stockReceipts).where(eq(stockReceipts.companyId, companyId));
    await cleanupTestCompany(companyId);
  });

  it("pobranie części na zlecenie pomniejsza magazyn: 10.00 − 2.50 = 7.50", async () => {
    const line = await WorkOrderSparePartService.pickPartFromWarehouse(
      companyId,
      userId,
      workOrderId,
      { partId, quantity: "2.50", unitPrice: "19.99" }
    );
    lineId = line.id;
    expect(line.quantity).toBe("2.50");
    expect(await readStock(companyId, partId)).toBe("7.50");

    const [linked] = await db
      .select({ quantity: stockIssues.quantity, workOrderId: stockIssues.workOrderId })
      .from(stockIssues)
      .where(
        and(eq(stockIssues.companyId, companyId), eq(stockIssues.workOrderSparePartId, lineId))
      );
    expect(linked?.quantity).toBe("2.50");
    expect(linked?.workOrderId).toBe(workOrderId);
  });

  it("korekta ilości na zleceniu dopasowuje stan: 2.50 → 4.00 ⇒ stan 6.00", async () => {
    const updated = await WorkOrderSparePartService.updatePartInOrderWithStock(
      companyId,
      userId,
      lineId,
      workOrderId,
      { quantity: "4.00" }
    );
    expect(updated?.quantity).toBe("4.00");
    expect(await readStock(companyId, partId)).toBe("6.00");

    const [linked] = await db
      .select({ quantity: stockIssues.quantity })
      .from(stockIssues)
      .where(
        and(eq(stockIssues.companyId, companyId), eq(stockIssues.workOrderSparePartId, lineId))
      );
    expect(linked?.quantity).toBe("4.00");
  });

  it("korekta z nieprawidłową ilością rzuca invalid_quantity i nie zmienia stanu", async () => {
    await expect(
      WorkOrderSparePartService.updatePartInOrderWithStock(companyId, userId, lineId, workOrderId, {
        quantity: "0",
      })
    ).rejects.toThrow("invalid_quantity");
    expect(await readStock(companyId, partId)).toBe("6.00");
  });

  it("zwrot części przywraca stan (6.00 + 4.00 = 10.00) i usuwa wpis ze zlecenia", async () => {
    const deleted = await WorkOrderSparePartService.returnPartToWarehouse(
      companyId,
      userId,
      lineId,
      workOrderId
    );
    expect(deleted?.id).toBe(lineId);
    expect(await readStock(companyId, partId)).toBe("10.00");

    const lines = await WorkOrderSparePartService.getPartsForOrder(workOrderId);
    expect(lines).toHaveLength(0);

    const receipts = await StockMovementService.getReceipts(companyId);
    const returnReceipt = receipts.find((r) => r.notes?.includes("Zwrot ze zlecenia"));
    expect(returnReceipt?.quantity).toBe("4.00");
  });

  it("pobranie ponad stan rzuca insufficient_stock bez wpisu na zleceniu (rollback)", async () => {
    await expect(
      WorkOrderSparePartService.pickPartFromWarehouse(companyId, userId, workOrderId, {
        partId,
        quantity: "999.00",
      })
    ).rejects.toThrow("insufficient_stock");

    expect(await readStock(companyId, partId)).toBe("10.00");
    const lines = await WorkOrderSparePartService.getPartsForOrder(workOrderId);
    expect(lines).toHaveLength(0);
  });

  it("część innej firmy rzuca part_not_found (izolacja multi-tenant)", async () => {
    const otherCompany = await createTestCompany();
    try {
      const foreignPartId = await SparePartService.addPart(otherCompany.id, {
        name: "__ITEST obca część",
      });
      await expect(
        WorkOrderSparePartService.pickPartFromWarehouse(companyId, userId, workOrderId, {
          partId: foreignPartId,
          quantity: "1",
        })
      ).rejects.toThrow("part_not_found");
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });

  it("zwrot nieistniejącej pozycji zwraca null", async () => {
    const result = await WorkOrderSparePartService.returnPartToWarehouse(
      companyId,
      userId,
      999_999_999,
      workOrderId
    );
    expect(result).toBeNull();
  });
});
