import { describe, expect, it } from "vitest";
import { filterResourcesForCategory } from "@/lib/filterResourcesForCategory";

const category = { id: 2, isGlobal: false };
const globalCategory = { id: 3, isGlobal: true };
const resources = [
  { id: 1, name: "A", categoryIds: [2] },
  { id: 2, name: "B", categoryIds: [9] },
  { id: 3, name: "C", categoryIds: [2, 5] },
];

describe("filterResourcesForCategory", () => {
  it("returns all resources when category is missing and whenNoCategory is true", () => {
    expect(filterResourcesForCategory(resources, undefined, { whenNoCategory: true })).toHaveLength(3);
  });

  it("returns none when category is missing and whenNoCategory is false", () => {
    expect(filterResourcesForCategory(resources, undefined, { whenNoCategory: false })).toEqual([]);
  });

  it("matches category id or global category", () => {
    expect(filterResourcesForCategory(resources, category, { whenNoCategory: false }).map((r) => r.id)).toEqual([
      1, 3,
    ]);
    expect(filterResourcesForCategory(resources, globalCategory, { whenNoCategory: false })).toHaveLength(3);
  });
});
