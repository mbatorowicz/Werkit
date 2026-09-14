import { describe, expect, it } from "vitest";
import {
  gpsPolicyFromSession,
  resolveCategoryPolicy,
  resolveFieldVisibility,
  resolveGpsPolicy,
  resolveOrderKind,
} from "@/lib/categoryPolicy";

describe("categoryPolicy", () => {
  it("gpsPolicy: isStationary → stationary, inaczej track", () => {
    expect(resolveGpsPolicy(true)).toBe("stationary");
    expect(resolveGpsPolicy(false)).toBe("track");
    expect(resolveGpsPolicy(null)).toBe("track");
    expect(resolveGpsPolicy(undefined)).toBe("track");
  });

  it("gpsPolicyFromSession czyta gpsPolicy, a bez niego legacy categoryIsStationary", () => {
    expect(gpsPolicyFromSession({ gpsPolicy: "stationary", categoryIsStationary: false })).toBe(
      "stationary"
    );
    expect(gpsPolicyFromSession({ gpsPolicy: "track", categoryIsStationary: true })).toBe("track");
    expect(gpsPolicyFromSession({ categoryIsStationary: true })).toBe("stationary");
    expect(gpsPolicyFromSession(null)).toBe("track");
  });

  it("orderKind: jawny rodzaj, potem kategoria, na końcu machine_work", () => {
    expect(resolveOrderKind("machine_repair", "machine_work")).toBe("machine_repair");
    expect(resolveOrderKind(undefined, "machine_repair")).toBe("machine_repair");
    expect(resolveOrderKind(null, null)).toBe("machine_work");
  });

  it("fieldVisibility: brak flag → wszystkie pola widoczne", () => {
    expect(resolveFieldVisibility(undefined)).toEqual({
      showCustomer: true,
      showMaterial: true,
      showQuantity: true,
      showTaskDescription: true,
    });
    expect(resolveFieldVisibility({ showMaterial: false, showQuantity: false })).toEqual({
      showCustomer: true,
      showMaterial: false,
      showQuantity: false,
      showTaskDescription: true,
    });
  });

  it("resolveCategoryPolicy składa trzy odczyty z wiersza kategorii", () => {
    expect(
      resolveCategoryPolicy({
        isStationary: true,
        orderType: "machine_repair",
        showCustomer: false,
        showMaterial: false,
        showQuantity: false,
        showTaskDescription: true,
      })
    ).toEqual({
      gpsPolicy: "stationary",
      orderKind: "machine_repair",
      fieldVisibility: {
        showCustomer: false,
        showMaterial: false,
        showQuantity: false,
        showTaskDescription: true,
      },
    });
  });
});
