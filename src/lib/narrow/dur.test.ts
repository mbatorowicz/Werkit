import { describe, expect, it } from "vitest";
import { narrowSpareParts, narrowSparePart, narrowSparePartCategories } from "./dur";

describe("narrowSpareParts", () => {
  it("zwraca pustą tablicę dla null/undefined/obiektu", () => {
    expect(narrowSpareParts(null)).toEqual([]);
    expect(narrowSpareParts(undefined)).toEqual([]);
    expect(narrowSpareParts({})).toEqual([]);
  });

  it("pomija null w tablicy i zwraca tylko poprawne wiersze", () => {
    const out = narrowSpareParts([
      {
        id: 1,
        name: "Łożysko",
        companyId: 1,
        catalogNumber: "SKF-6205",
        manufacturer: "SKF",
        unit: "szt",
        purchasePrice: "45.50",
        description: "Łożysko kulkowe",
        minStock: "10",
        location: "A-12",
        imageUrl: null,
        isActive: true,
        createdAt: "2026-05-01T00:00:00Z",
        categoryIds: [1, 2],
        machineCategoryIds: [3],
      },
      null,
      { id: 2, name: "Filtr oleju", companyId: 1 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe(1);
    expect(out[0].name).toBe("Łożysko");
    expect(out[0].catalogNumber).toBe("SKF-6205");
    expect(out[0].purchasePrice).toBe("45.50");
    expect(out[0].categoryIds).toEqual([1, 2]);
    expect(out[0].machineCategoryIds).toEqual([3]);
    expect(out[1].id).toBe(2);
    expect(out[1].name).toBe("Filtr oleju");
  });

  it("uzupełnia domyślne wartości dla brakujących pól", () => {
    const out = narrowSpareParts([{ id: 1, name: "Test", companyId: 1 }]);
    expect(out[0]).toMatchObject({
      catalogNumber: "",
      manufacturer: "",
      unit: "szt",
      purchasePrice: null,
      description: null,
      minStock: "0",
      location: "",
      imageUrl: null,
      isActive: true,
      categoryIds: [],
      machineCategoryIds: [],
    });
  });
});

describe("narrowSparePart", () => {
  it("zwraca null dla niepoprawnych danych", () => {
    expect(narrowSparePart(null)).toBeNull();
    expect(narrowSparePart("x")).toBeNull();
    expect(narrowSparePart([])).toBeNull();
  });

  it("zwraca obiekt dla poprawnego rekordu", () => {
    const out = narrowSparePart({
      id: 5,
      name: "Uszczelka",
      companyId: 1,
    });
    expect(out).not.toBeNull();
    expect(out!.id).toBe(5);
    expect(out!.name).toBe("Uszczelka");
  });
});

describe("narrowSparePartCategories", () => {
  it("zwraca pustą tablicę dla niepoprawnych danych", () => {
    expect(narrowSparePartCategories(null)).toEqual([]);
    expect(narrowSparePartCategories({})).toEqual([]);
  });

  it("pomija null w tablicy", () => {
    const out = narrowSparePartCategories([
      { id: 1, name: "Łożyska", companyId: 1, isGroup: true, sortOrder: 0 },
      null,
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
    expect(out[0].name).toBe("Łożyska");
    expect(out[0].isGroup).toBe(true);
  });

  it("obsługuje parentId null", () => {
    const out = narrowSparePartCategories([
      {
        id: 2,
        name: "Filtry",
        companyId: 1,
        parentId: null,
        isGroup: false,
        sortOrder: 1,
        color: "#ff0000",
      },
    ]);
    expect(out[0].parentId).toBeNull();
    expect(out[0].color).toBe("#ff0000");
  });
});
