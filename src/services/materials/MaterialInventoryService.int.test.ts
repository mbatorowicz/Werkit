import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MaterialInventoryService } from "@/services/materials/MaterialInventoryService";
import { cleanupTestCompany, createTestCompany, createTestMaterial } from "@/test/integrationDb";

async function readStock(companyId: number, materialId: number): Promise<string | null> {
  const rows = await MaterialInventoryService.getInventory(companyId, { materialId });
  return rows[0]?.quantity ?? null;
}

describe("MaterialInventoryService (integracja z bazą)", () => {
  let companyId: number;
  let materialId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const material = await createTestMaterial(companyId, { name: "__ITEST kruszywo" });
    materialId = material.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("bez wpisu magazynowego getInventory zwraca pustą listę", async () => {
    const rows = await MaterialInventoryService.getInventory(companyId, { materialId });
    expect(rows).toHaveLength(0);
  });

  it("setQuantity tworzy wiersz — stan dokładnie 15.00", async () => {
    await MaterialInventoryService.setQuantity(companyId, materialId, "15");
    const rows = await MaterialInventoryService.getInventory(companyId, { materialId });
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe("15.00");
    expect(rows[0].materialName).toBe("__ITEST kruszywo");
  });

  it("korekta: setQuantity nadpisuje stan (15.00 → 7.25)", async () => {
    await MaterialInventoryService.setQuantity(companyId, materialId, "7.25");
    expect(await readStock(companyId, materialId)).toBe("7.25");
  });

  it("upsertQuantity sumuje delty: 10.50 + 2.25 − 3.25 = 9.50", async () => {
    await MaterialInventoryService.setQuantity(companyId, materialId, "10.50");
    await MaterialInventoryService.upsertQuantity(companyId, materialId, "2.25");
    expect(await readStock(companyId, materialId)).toBe("12.75");

    await MaterialInventoryService.upsertQuantity(companyId, materialId, "-3.25");
    expect(await readStock(companyId, materialId)).toBe("9.50");
  });

  it("getInventory zwraca wyłącznie stany własnej firmy", async () => {
    const otherCompany = await createTestCompany();
    try {
      const otherMaterial = await createTestMaterial(otherCompany.id);
      await MaterialInventoryService.setQuantity(otherCompany.id, otherMaterial.id, "100");

      const own = await MaterialInventoryService.getInventory(companyId);
      expect(own.every((row) => row.companyId === companyId)).toBe(true);
      expect(own.some((row) => row.materialId === otherMaterial.id)).toBe(false);

      const foreign = await MaterialInventoryService.getInventory(otherCompany.id);
      expect(foreign).toHaveLength(1);
      expect(foreign[0].quantity).toBe("100.00");
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });
});
