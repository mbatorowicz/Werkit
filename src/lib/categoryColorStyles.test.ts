import { describe, expect, it } from "vitest";
import {
  categoryColorBadgeStyle,
  categoryColorChipClassName,
  categoryColorChipStyle,
  DEFAULT_CATEGORY_COLOR,
  resolveCategoryColor,
} from "./categoryColorStyles";

describe("categoryColorStyles", () => {
  it("resolveCategoryColor używa domyślnego gdy brak koloru", () => {
    expect(resolveCategoryColor(null)).toBe(DEFAULT_CATEGORY_COLOR);
    expect(resolveCategoryColor("  #ff00aa  ")).toBe("#ff00aa");
  });

  it("categoryColorBadgeStyle buduje spójne tło i obramowanie", () => {
    expect(categoryColorBadgeStyle("#ff0000")).toEqual({
      backgroundColor: "#ff00001a",
      color: "#ff0000",
      borderColor: "#ff000033",
    });
  });

  it("chip ze słownikiem używa badge style gdy zaznaczony", () => {
    expect(categoryColorChipStyle(true, "#00ff00")).toEqual(categoryColorBadgeStyle("#00ff00"));
    expect(categoryColorChipStyle(false, "#00ff00")).toBeUndefined();
    expect(categoryColorChipStyle(true, null)).toBeUndefined();
  });

  it("chip bez koloru w słowniku — klasy wariantu", () => {
    expect(categoryColorChipClassName(true, null, "blue")).toContain("blue");
    expect(categoryColorChipClassName(false, "#ff0000")).toContain("border-zinc-200");
  });
});
