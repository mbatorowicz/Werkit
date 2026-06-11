import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InventoryService } from "@/services/dur/InventoryService";
import { SparePartService } from "@/services/dur/SparePartService";
import { cleanupTestCompany, createTestCompany } from "@/test/integrationDb";

describe("InventoryService (integracja z bazą)", () => {
  let companyId: number;
  let partId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    partId = await SparePartService.addPart(companyId, { name: "__ITEST część magazynowa" });
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("bez wpisu magazynowego getPartInventory zwraca null", async () => {
    const inventory = await InventoryService.getPartInventory(companyId, partId);
    expect(inventory).toBeNull();
  });

  it("setQuantity tworzy wiersz — stan dokładnie 15.00", async () => {
    await InventoryService.setQuantity(companyId, partId, "15");
    const inventory = await InventoryService.getPartInventory(companyId, partId);
    expect(inventory?.quantity).toBe("15.00");
    expect(inventory?.partName).toBe("__ITEST część magazynowa");
  });

  it("korekta: setQuantity nadpisuje stan (15.00 → 7.25)", async () => {
    await InventoryService.setQuantity(companyId, partId, "7.25");
    const inventory = await InventoryService.getPartInventory(companyId, partId);
    expect(inventory?.quantity).toBe("7.25");
  });

  it("upsertQuantity sumuje delty: 10.50 + 2.25 − 3.25 = 9.50", async () => {
    await InventoryService.setQuantity(companyId, partId, "10.50");
    await InventoryService.upsertQuantity(companyId, partId, "2.25");
    expect((await InventoryService.getPartInventory(companyId, partId))?.quantity).toBe("12.75");

    await InventoryService.upsertQuantity(companyId, partId, "-3.25");
    expect((await InventoryService.getPartInventory(companyId, partId))?.quantity).toBe("9.50");
  });

  it("getInventory zwraca wyłącznie stany własnej firmy", async () => {
    const otherCompany = await createTestCompany();
    try {
      const otherPartId = await SparePartService.addPart(otherCompany.id, {
        name: "__ITEST obca część",
      });
      await InventoryService.setQuantity(otherCompany.id, otherPartId, "100");

      const own = await InventoryService.getInventory(companyId);
      expect(own.every((row) => row.companyId === companyId)).toBe(true);
      expect(own.some((row) => row.partId === otherPartId)).toBe(false);

      const foreign = await InventoryService.getInventory(otherCompany.id);
      expect(foreign).toHaveLength(1);
      expect(foreign[0].quantity).toBe("100.00");
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });
});
