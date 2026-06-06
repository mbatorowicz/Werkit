import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATERIAL_MEASURE_UNIT,
  measureUnitSelectValues,
  normalizeMeasureUnit,
  resolveMeasureUnit,
} from "./measureUnits";

describe("measureUnits", () => {
  it("normalizeMeasureUnit akceptuje kanoniczne jednostki", () => {
    expect(normalizeMeasureUnit("t")).toBe("t");
    expect(normalizeMeasureUnit(" szt. ")).toBe("szt.");
  });

  it("normalizeMeasureUnit odrzuca nieznane wartości", () => {
    expect(normalizeMeasureUnit("boks")).toBeNull();
    expect(normalizeMeasureUnit("")).toBeNull();
  });

  it("resolveMeasureUnit używa fallbacku", () => {
    expect(resolveMeasureUnit("kg", DEFAULT_MATERIAL_MEASURE_UNIT)).toBe("kg");
    expect(resolveMeasureUnit("x", DEFAULT_MATERIAL_MEASURE_UNIT)).toBe("t");
  });

  it("measureUnitSelectValues dołącza legacy wartość", () => {
    expect(measureUnitSelectValues("boks")[0]).toBe("boks");
    expect(measureUnitSelectValues("kg")).not.toContain("boks");
  });
});
