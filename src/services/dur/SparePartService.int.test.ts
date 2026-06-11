import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { sparePartCategories } from "@/db/schema";
import { SparePartService } from "@/services/dur/SparePartService";
import { cleanupTestCompany, createTestCompany, uniqueTestSlug } from "@/test/integrationDb";

/** Lokalny helper — kategorie części DUR (spare_part_categories), brak w fixtures. */
async function createSparePartCategory(
  companyId: number,
  options: { isGroup?: boolean; parentId?: number | null } = {}
): Promise<{ id: number }> {
  const [row] = await db
    .insert(sparePartCategories)
    .values({
      companyId,
      name: `__ITEST kat. części ${uniqueTestSlug()}`,
      isGroup: options.isGroup ?? false,
      parentId: options.parentId ?? null,
    })
    .returning({ id: sparePartCategories.id });
  return row;
}

describe("SparePartService (integracja z bazą)", () => {
  let companyId: number;
  let leafCategoryId: number;
  let groupCategoryId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const [leaf, group] = await Promise.all([
      createSparePartCategory(companyId),
      createSparePartCategory(companyId, { isGroup: true }),
    ]);
    leafCategoryId = leaf.id;
    groupCategoryId = group.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("dodaje część z wartościami domyślnymi i odczytuje ją", async () => {
    const partId = await SparePartService.addPart(companyId, {
      name: "  __ITEST łożysko  ",
    });
    expect(partId).toBeGreaterThan(0);

    const part = await SparePartService.getPart(companyId, partId);
    expect(part).not.toBeNull();
    expect(part?.name).toBe("__ITEST łożysko");
    expect(part?.unit).toBe("szt.");
    expect(part?.minStock).toBe("0.00");
    expect(part?.purchasePrice).toBeNull();
    expect(part?.isActive).toBe(true);
    expect(part?.categoryIds).toEqual([]);
  });

  it("dodaje część z ceną i przypisaniem kategorii (liść)", async () => {
    const partId = await SparePartService.addPart(companyId, {
      name: "__ITEST filtr oleju",
      purchasePrice: "12.50",
      unit: "kg",
      categoryIds: [leafCategoryId],
    });

    const part = await SparePartService.getPart(companyId, partId);
    expect(part?.purchasePrice).toBe("12.50");
    expect(part?.unit).toBe("kg");
    expect(part?.categoryIds).toEqual([leafCategoryId]);
  });

  it("odrzuca nieprawidłową jednostkę miary (invalid_unit)", async () => {
    await expect(
      SparePartService.addPart(companyId, { name: "__ITEST zła jednostka", unit: "xyz" })
    ).rejects.toThrow("invalid_unit");
  });

  it("odrzuca przypisanie do grupy organizacyjnej kategorii (invalid_category)", async () => {
    await expect(
      SparePartService.addPart(companyId, {
        name: "__ITEST grupa zamiast liścia",
        categoryIds: [groupCategoryId],
      })
    ).rejects.toThrow("invalid_category");
  });

  it("odrzuca kategorię innej firmy (izolacja multi-tenant)", async () => {
    const otherCompany = await createTestCompany();
    try {
      const foreignCategory = await createSparePartCategory(otherCompany.id);
      await expect(
        SparePartService.addPart(companyId, {
          name: "__ITEST obca kategoria",
          categoryIds: [foreignCategory.id],
        })
      ).rejects.toThrow("invalid_category");
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });

  it("edytuje część — nazwę, cenę i wymianę kategorii", async () => {
    const partId = await SparePartService.addPart(companyId, {
      name: "__ITEST do edycji",
      purchasePrice: "10.00",
      categoryIds: [leafCategoryId],
    });

    const otherLeaf = await createSparePartCategory(companyId);
    await SparePartService.updatePart(companyId, partId, {
      name: "__ITEST po edycji",
      purchasePrice: "99.99",
      categoryIds: [otherLeaf.id],
    });

    const part = await SparePartService.getPart(companyId, partId);
    expect(part?.name).toBe("__ITEST po edycji");
    expect(part?.purchasePrice).toBe("99.99");
    expect(part?.categoryIds).toEqual([otherLeaf.id]);
  });

  it("usuwa część wyłącznie we własnej firmie", async () => {
    const partId = await SparePartService.addPart(companyId, { name: "__ITEST do usunięcia" });

    const otherCompany = await createTestCompany();
    try {
      // Próba usunięcia z kontekstu innej firmy nie może ruszyć danych.
      await SparePartService.deletePart(otherCompany.id, partId);
      expect(await SparePartService.getPart(companyId, partId)).not.toBeNull();

      await SparePartService.deletePart(companyId, partId);
      expect(await SparePartService.getPart(companyId, partId)).toBeNull();
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });
});
