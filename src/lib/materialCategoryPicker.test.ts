import { describe, expect, it } from "vitest";
import {
  filterMaterialsByMaterialCategory,
  inferMaterialCategoryId,
  parseMaterialCategoryOptionId,
  toMaterialCategoryOptionId,
} from "./materialCategoryPicker";

describe("materialCategoryPicker", () => {
  const materials = [
    { id: 1, name: "Piasek", categoryIds: [10, 11] },
    { id: 2, name: "Ziemia", categoryIds: [10] },
    { id: 3, name: "Inne", categoryIds: [12] },
  ];

  it("filterMaterialsByMaterialCategory zwraca tylko materiały z kategorii", () => {
    expect(filterMaterialsByMaterialCategory(materials, "10").map((m) => m.id)).toEqual([1, 2]);
    expect(filterMaterialsByMaterialCategory(materials, "")).toEqual([]);
  });

  it("inferMaterialCategoryId bierze preferred lub pierwszą z materiału", () => {
    expect(inferMaterialCategoryId("1", materials, "11")).toBe("11");
    expect(inferMaterialCategoryId("1", materials)).toBe("10");
    expect(inferMaterialCategoryId("", materials)).toBe("");
  });

  it("prefiks opcji kategorii", () => {
    expect(parseMaterialCategoryOptionId(toMaterialCategoryOptionId(5))).toBe(5);
    expect(parseMaterialCategoryOptionId("1")).toBeNull();
  });
});
