import { describe, expect, it, vi, beforeEach } from "vitest";

const { selectMock, insertMock, updateMock, deleteMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock("@/db/schema", () => ({
  spareParts: {
    id: "id",
    companyId: "companyId",
    name: "name",
    catalogNumber: "catalogNumber",
    manufacturer: "manufacturer",
    unit: "unit",
    purchasePrice: "purchasePrice",
    description: "description",
    minStock: "minStock",
    location: "location",
    imageUrl: "imageUrl",
    isActive: "isActive",
    createdAt: "createdAt",
  },
  sparePartToCategories: {
    partId: "partId",
    categoryId: "categoryId",
  },
  sparePartMachineCompatibility: {
    partId: "partId",
    resourceGroupId: "resourceGroupId",
    notes: "notes",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
}));

vi.mock("@/services/dur/categoryValidation", () => ({
  assertSparePartCategoriesAssignable: vi.fn().mockResolvedValue(undefined),
  assertResourceGroupsAssignable: vi.fn().mockResolvedValue(undefined),
  CategoryHierarchyError: class extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

import { SparePartService } from "./SparePartService";

describe("SparePartService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  const companyId = 1;

  describe("getParts", () => {
    it("zwraca listę części z pustymi linkami", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () =>
                Promise.resolve([
                  {
                    id: 1,
                    companyId,
                    name: "Łożysko",
                    catalogNumber: "SKF-6205",
                    manufacturer: "SKF",
                    unit: "szt",
                    purchasePrice: "45.50",
                    description: null,
                    minStock: "10",
                    location: "A-12",
                    imageUrl: null,
                    isActive: true,
                    createdAt: "2026-05-01T00:00:00Z",
                  },
                ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => Promise.resolve([]),
        })
        .mockReturnValueOnce({
          from: () => Promise.resolve([]),
        });

      const result = await SparePartService.getParts(companyId);
      expect(result).toHaveLength(1);
      expect(result[0].categoryIds).toEqual([]);
      expect(result[0].machineCategoryIds).toEqual([]);
    });

    it("zwraca część z linkami do kategorii", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () =>
                Promise.resolve([
                  {
                    id: 1,
                    companyId,
                    name: "Łożysko",
                    catalogNumber: "SKF-6205",
                    manufacturer: "SKF",
                    unit: "szt",
                    purchasePrice: "45.50",
                    description: null,
                    minStock: "10",
                    location: "A-12",
                    imageUrl: null,
                    isActive: true,
                    createdAt: "2026-05-01T00:00:00Z",
                  },
                ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () =>
            Promise.resolve([
              { partId: 1, categoryId: 10 },
              { partId: 1, categoryId: 20 },
            ]),
        })
        .mockReturnValueOnce({
          from: () => Promise.resolve([{ partId: 1, resourceGroupId: 30 }]),
        });

      const result = await SparePartService.getParts(companyId);
      expect(result[0].categoryIds).toEqual([10, 20]);
      expect(result[0].resourceGroupIds).toEqual([30]);
    });

    it("filtruje części po grupie maszyn", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () =>
                Promise.resolve([
                  {
                    id: 1,
                    companyId,
                    name: "Część A",
                    catalogNumber: "A-001",
                    manufacturer: "Mfg",
                    unit: "szt",
                    purchasePrice: null,
                    description: null,
                    minStock: "0",
                    location: "",
                    imageUrl: null,
                    isActive: true,
                    createdAt: "2026-05-01T00:00:00Z",
                  },
                  {
                    id: 2,
                    companyId,
                    name: "Część B",
                    catalogNumber: "B-001",
                    manufacturer: "Mfg",
                    unit: "szt",
                    purchasePrice: null,
                    description: null,
                    minStock: "0",
                    location: "",
                    imageUrl: null,
                    isActive: true,
                    createdAt: "2026-05-01T00:00:00Z",
                  },
                ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => Promise.resolve([]),
        })
        .mockReturnValueOnce({
          from: () =>
            Promise.resolve([{ partId: 1, resourceGroupId: 30 }]),
        });

      const result = await SparePartService.getParts(companyId, {
        compatibleWithResourceGroupId: 30,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe("getPart", () => {
    it("zwraca null gdy część nie istnieje", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      });

      const result = await SparePartService.getPart(companyId, 999);
      expect(result).toBeNull();
    });

    it("zwraca część z linkami", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    id: 1,
                    companyId,
                    name: "Filtr",
                    catalogNumber: "FL-100",
                    manufacturer: "Mann",
                    unit: "szt",
                    purchasePrice: "25.00",
                    description: null,
                    minStock: "5",
                    location: "B-01",
                    imageUrl: null,
                    isActive: true,
                    createdAt: "2026-05-01T00:00:00Z",
                  },
                ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ partId: 1, categoryId: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([]),
          }),
        });

      const result = await SparePartService.getPart(companyId, 1);
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Filtr");
      expect(result!.categoryIds).toEqual([5]);
      expect(result!.machineCategoryIds).toEqual([]);
    });
  });

  describe("addPart", () => {
    it("dodaje część bez kategorii", async () => {
      insertMock.mockReturnValue({
        values: () => ({
          returning: () => Promise.resolve([{ id: 1 }]),
        }),
      });

      const result = await SparePartService.addPart(companyId, { name: "Nowa część" });
      expect(result).toBe(1);
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    it("dodaje część z kategoriami i kompatybilnością", async () => {
      insertMock.mockReturnValue({
        values: () => ({
          returning: () => Promise.resolve([{ id: 1 }]),
        }),
      });

      const result = await SparePartService.addPart(companyId, {
        name: "Część z linkami",
        categoryIds: [10, 20],
        resourceGroupIds: [30],
      });
      expect(result).toBe(1);
      // insert: spareParts + sparePartToCategories + sparePartMachineCompatibility
      expect(insertMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("updatePart", () => {
    it("aktualizuje tylko podstawowe pola", async () => {
      updateMock.mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      });

      await SparePartService.updatePart(companyId, 1, { name: "Zmieniona nazwa" });
      expect(updateMock).toHaveBeenCalled();
    });

    it("aktualizuje kategorie części", async () => {
      updateMock.mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      });
      deleteMock.mockReturnValue({
        where: () => Promise.resolve(),
      });
      insertMock.mockReturnValue({
        values: () => Promise.resolve(),
      });

      await SparePartService.updatePart(companyId, 1, {
        name: "Test",
        categoryIds: [1, 2],
      });
      // update + delete(stc) + insert(stc)
      expect(deleteMock).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
    });
  });

  describe("deletePart", () => {
    it("usuwa część", async () => {
      deleteMock.mockReturnValue({
        where: () => Promise.resolve(),
      });

      await SparePartService.deletePart(companyId, 1);
      expect(deleteMock).toHaveBeenCalled();
    });
  });
});
