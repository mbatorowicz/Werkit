import { describe, expect, it } from "vitest";
import { categoryColorBadgeStyle, resolveCategoryColor } from "./categoryColorStyles";

describe("categoryColorStyles", () => {
  it("resolveCategoryColor używa domyślnego gdy brak koloru", () => {
    expect(resolveCategoryColor(null)).toBe("#71717a");
    expect(resolveCategoryColor("  #ff00aa  ")).toBe("#ff00aa");
  });

  it("categoryColorBadgeStyle buduje spójne tło i obramowanie", () => {
    expect(categoryColorBadgeStyle("#ff0000")).toEqual({
      backgroundColor: "#ff00001a",
      color: "#ff0000",
      borderColor: "#ff000033",
    });
  });
});
