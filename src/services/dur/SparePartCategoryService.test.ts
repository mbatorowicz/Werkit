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
  sparePartCategories: {
    id: "id",
    companyId: "companyId",
    name: "name",
    parentId: "parentId",
    isGroup: "isGroup",
    sortOrder: "sortOrder",
    color: "color",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
}));

vi.mock("@/lib/categoryTree", () => ({
  filterCategoryLeaves: (rows: unknown[]) =>
    (rows as Array<{ isGroup: boolean }>).filter((r) => !r.isGroup),
}));

import { SparePartCategoryService } from "./SparePartCategoryService";
import { CategoryHierarchyError } from "./categoryValidation";

describe("SparePartCategoryService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  const companyId = 1;

  describe("getCategories", () => {
    it("zwraca wszystkie kategorie posortowane", async () => {
      const fakeRows = [
        { id: 1, companyId, name: "Łożyska", parentId: null, isGroup: true, sortOrder: 0, color: "#3f3f46" },
        { id: 2, companyId, name: "Filtry", parentId: null, isGroup: false, sortOrder: 1, color: "#ff0000" },
      ];
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(fakeRows),
          }),
        }),
      });

      const result = await SparePartCategoryService.getCategories(companyId);
      expect(result).toEqual(fakeRows);
      expect(selectMock).toHaveBeenCalled();
    });

    it("zwraca tylko liście gdy leavesOnly=true", async () => {
      const fakeRows = [
        { id: 1, companyId, name: "Łożyska", parentId: null, isGroup: true, sortOrder: 0, color: "#3f3f46" },
        { id: 2, companyId, name: "Filtr oleju", parentId: 1, isGroup: false, sortOrder: 0, color: null },
      ];
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(fakeRows),
          }),
        }),
      });

      const result = await SparePartCategoryService.getCategories(companyId, { leavesOnly: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });
  });

  describe("addCategory", () => {
    it("dodaje kategorię z domyślnymi wartościami", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve([]),
          }),
        }),
      });
      insertMock.mockReturnValue({
        values: () => Promise.resolve(),
      });

      await SparePartCategoryService.addCategory(companyId, { name: "Nowa kategoria" });
      expect(insertMock).toHaveBeenCalled();
    });

    it("rzuca błąd gdy parent nie jest grupą", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            orderBy: () =>
              Promise.resolve([
                { id: 1, companyId, name: "Liść", parentId: null, isGroup: false, sortOrder: 0, color: "#3f3f46" },
              ]),
          }),
        }),
      });

      await expect(
        SparePartCategoryService.addCategory(companyId, { name: "Podkategoria", parentId: 1 }),
      ).rejects.toThrow(CategoryHierarchyError);
    });
  });

  describe("updateCategory", () => {
    it("aktualizuje kategorię", async () => {
      const existing = [
        { id: 1, companyId, name: "Łożyska", parentId: null, isGroup: true, sortOrder: 0, color: "#3f3f46" },
      ];
      selectMock.mockReturnValue({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(existing),
          }),
        }),
      });
      updateMock.mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      });

      await SparePartCategoryService.updateCategory(companyId, 1, { name: "Zmieniona nazwa" });
      expect(updateMock).toHaveBeenCalled();
    });

    it("rzuca błąd przy zmianie grupy na liść gdy ma dzieci", async () => {
      const existing = [
        { id: 1, companyId, name: "Grupa", parentId: null, isGroup: true, sortOrder: 0, color: "#3f3f46" },
        { id: 2, companyId, name: "Dziecko", parentId: 1, isGroup: false, sortOrder: 0, color: null },
      ];
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => Promise.resolve(existing),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ id: 2 }]),
          }),
        });

      await expect(
        SparePartCategoryService.updateCategory(companyId, 1, { isGroup: false }),
      ).rejects.toThrow(CategoryHierarchyError);
    });
  });

  describe("deleteCategory", () => {
    it("usuwa kategorię bez dzieci", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      });
      deleteMock.mockReturnValue({
        where: () => Promise.resolve(),
      });

      await SparePartCategoryService.deleteCategory(companyId, 1);
      expect(deleteMock).toHaveBeenCalled();
    });

    it("rzuca błąd przy usuwaniu kategorii z dziećmi", async () => {
      selectMock.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ id: 2 }]),
        }),
      });

      await expect(
        SparePartCategoryService.deleteCategory(companyId, 1),
      ).rejects.toThrow(CategoryHierarchyError);
    });
  });
});
