import { describe, expect, it, vi, beforeEach } from "vitest";

const { selectMock, insertMock, deleteMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
  },
}));

vi.mock("@/db/schema", () => ({
  spareParts: {
    id: "id",
    companyId: "companyId",
    name: "name",
    catalogNumber: "catalogNumber",
    isActive: "isActive",
  },
  sparePartMachineCompatibility: {
    partId: "partId",
    categoryId: "categoryId",
    notes: "notes",
  },
  resourceCategories: {
    id: "id",
    companyId: "companyId",
    name: "name",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
}));

import { SparePartCompatibilityService } from "./SparePartCompatibilityService";

describe("SparePartCompatibilityService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    deleteMock.mockReset();
  });

  const companyId = 1;

  describe("getForPart", () => {
    it("zwraca pustą tablicę gdy część nie istnieje", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      });

      const result = await SparePartCompatibilityService.getForPart(999, companyId);
      expect(result).toEqual([]);
    });

    it("zwraca kompatybilności dla istniejącej części", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            innerJoin: () => ({
              where: () =>
                Promise.resolve([
                  { categoryId: 10, notes: "Pasuje do koparki", categoryName: "Koparki" },
                  { categoryId: 20, notes: null, categoryName: "Ładowarki" },
                ]),
            }),
          }),
        });

      const result = await SparePartCompatibilityService.getForPart(1, companyId);
      expect(result).toHaveLength(2);
      expect(result[0].categoryName).toBe("Koparki");
      expect(result[1].categoryName).toBe("Ładowarki");
    });
  });

  describe("getForMachineCategory", () => {
    it("zwraca aktywne części dla kategorii maszyny", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          innerJoin: () => ({
            where: () =>
              Promise.resolve([
                { partId: 1, notes: null, partName: "Łożysko", partCatalogNumber: "SKF-6205" },
              ]),
          }),
        }),
      });

      const result = await SparePartCompatibilityService.getForMachineCategory(10, companyId);
      expect(result).toHaveLength(1);
      expect(result[0].partName).toBe("Łożysko");
    });
  });

  describe("add", () => {
    it("dodaje kompatybilność gdy część i kategoria istnieją", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: 10 }]),
            }),
          }),
        });

      insertMock.mockReturnValue({
        values: () => ({
          onConflictDoNothing: () => Promise.resolve(),
        }),
      });

      const result = await SparePartCompatibilityService.add(1, 10, companyId, "Uwaga");
      expect(result).toEqual({ partId: 1, categoryId: 10 });
    });

    it("rzuca błąd gdy część nie istnieje", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      });

      await expect(
        SparePartCompatibilityService.add(999, 10, companyId),
      ).rejects.toThrow("Part not found");
    });

    it("rzuca błąd gdy kategoria maszyny nie istnieje", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        });

      await expect(
        SparePartCompatibilityService.add(1, 999, companyId),
      ).rejects.toThrow("Machine category not found");
    });
  });

  describe("remove", () => {
    it("usuwa kompatybilność", async () => {
      deleteMock.mockReturnValue({
        where: () => Promise.resolve(),
      });

      await SparePartCompatibilityService.remove(1, 10);
      expect(deleteMock).toHaveBeenCalled();
    });
  });
});
