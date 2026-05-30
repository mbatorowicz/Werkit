import { describe, expect, it, vi, beforeEach } from "vitest";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
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
  inArray: (col: unknown, vals: unknown[]) => vals,
}));

import {
  validateHierarchyPatch,
  countSparePartCategoryChildren,
  assertSparePartCategoriesAssignable,
  CategoryHierarchyError,
} from "./categoryValidation";

describe("validateHierarchyPatch", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const allRows = [
    { id: 1, name: "Grupa A", parentId: null, isGroup: true, sortOrder: 0 },
    { id: 2, name: "Grupa B", parentId: null, isGroup: true, sortOrder: 1 },
    { id: 3, name: "Liść A1", parentId: 1, isGroup: false, sortOrder: 0 },
    { id: 4, name: "Liść A2", parentId: 1, isGroup: false, sortOrder: 1 },
  ];

  it("akceptuje poprawne przypisanie do grupy", () => {
    expect(() =>
      validateHierarchyPatch(allRows, { parentId: 1, isGroup: false }),
    ).not.toThrow();
  });

  it("rzuca błąd gdy parentId wskazuje na liść (nie grupę)", () => {
    expect(() =>
      validateHierarchyPatch(allRows, { parentId: 3, isGroup: false }),
    ).toThrow(CategoryHierarchyError);
    expect(() =>
      validateHierarchyPatch(allRows, { parentId: 3, isGroup: false }),
    ).toThrow(/parent_must_be_group/);
  });

  it("rzuca błąd gdy parentId === selfId", () => {
    expect(() =>
      validateHierarchyPatch(allRows, { parentId: 1, isGroup: true }, 1),
    ).toThrow(CategoryHierarchyError);
  });

  it("rzuca błąd gdy parent nie istnieje", () => {
    expect(() =>
      validateHierarchyPatch(allRows, { parentId: 999, isGroup: false }),
    ).toThrow(CategoryHierarchyError);
  });

  it("akceptuje kategorię bez rodzica (root)", () => {
    expect(() =>
      validateHierarchyPatch(allRows, { parentId: null, isGroup: true }),
    ).not.toThrow();
  });

  it("rzuca błąd gdy liść z dziećmi próbuje zostać bez rodzica", () => {
    const rowsWithChildren = [
      ...allRows,
      { id: 5, name: "Podliść", parentId: 3, isGroup: false, sortOrder: 0 },
    ];
    expect(() =>
      validateHierarchyPatch(rowsWithChildren, { parentId: null, isGroup: false }, 3),
    ).toThrow(CategoryHierarchyError);
    expect(() =>
      validateHierarchyPatch(rowsWithChildren, { parentId: null, isGroup: false }, 3),
    ).toThrow(/group_has_children/);
  });

  it("akceptuje brak zmian gdy patch jest pusty (undefined)", () => {
    expect(() =>
      validateHierarchyPatch(allRows, {}, 3),
    ).not.toThrow();
  });
});

describe("countSparePartCategoryChildren", () => {
  it("zwraca liczbę dzieci", async () => {
    selectMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ id: 2 }, { id: 3 }]),
      }),
    });

    const count = await countSparePartCategoryChildren(1);
    expect(count).toBe(2);
  });

  it("zwraca 0 gdy brak dzieci", async () => {
    selectMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    });

    const count = await countSparePartCategoryChildren(999);
    expect(count).toBe(0);
  });
});

describe("assertSparePartCategoriesAssignable", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("nie rzuca błędu dla pustej tablicy", async () => {
    await expect(
      assertSparePartCategoriesAssignable([], 1),
    ).resolves.toBeUndefined();
  });

  it("nie rzuca błędu dla niepoprawnych ID (filtrowane)", async () => {
    await expect(
      assertSparePartCategoriesAssignable([0, -1, NaN], 1),
    ).resolves.toBeUndefined();
  });

  it("rzuca błąd gdy kategoria nie istnieje", async () => {
    selectMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    });

    await expect(
      assertSparePartCategoriesAssignable([1], 1),
    ).rejects.toThrow(CategoryHierarchyError);
  });

  it("rzuca błąd gdy kategoria jest grupą", async () => {
    selectMock.mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: 1, companyId: 1, name: "Grupa", parentId: null, isGroup: true, sortOrder: 0, color: "#3f3f46" },
          ]),
      }),
    });

    await expect(
      assertSparePartCategoriesAssignable([1], 1),
    ).rejects.toThrow(CategoryHierarchyError);
  });

  it("przechodzi gdy wszystkie kategorie istnieją i są liśćmi", async () => {
    selectMock.mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: 1, companyId: 1, name: "Liść 1", parentId: null, isGroup: false, sortOrder: 0, color: null },
            { id: 2, companyId: 1, name: "Liść 2", parentId: null, isGroup: false, sortOrder: 1, color: null },
          ]),
      }),
    });

    await expect(
      assertSparePartCategoriesAssignable([1, 2], 1),
    ).resolves.toBeUndefined();
  });
});
