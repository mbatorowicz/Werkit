import { describe, expect, it } from "vitest";
import {
  orderLabelDescriptionText,
  resolveOrderLabelFieldVisibility,
} from "./orderLabelFieldVisibility";

describe("resolveOrderLabelFieldVisibility", () => {
  it("respektuje flagi kategorii dla naprawy i pracy", () => {
    const visRepair = resolveOrderLabelFieldVisibility({
      orderType: "machine_repair",
      showMaterial: false,
      showQuantity: false,
      showCustomer: false,
      showTaskDescription: true,
    });
    expect(visRepair.showMaterial).toBe(false);
    expect(visRepair.showQuantity).toBe(false);
    expect(visRepair.showCustomer).toBe(false);
    expect(visRepair.showDescription).toBe(true);
    expect(visRepair.descriptionLabel).toContain("napraw");

    const visWork = resolveOrderLabelFieldVisibility({
      orderType: "machine_work",
      showMaterial: true,
      showCustomer: true,
      showQuantity: true,
      showTaskDescription: false,
    });
    expect(visWork.showMaterial).toBe(true);
    expect(visWork.showDescription).toBe(false);
  });
});

describe("orderLabelDescriptionText", () => {
  it("zwraca repairDescription dla naprawy", () => {
    expect(
      orderLabelDescriptionText({
        orderType: "machine_repair",
        taskDescription: "zlecenie",
        repairDescription: "  wymiana  ",
      })
    ).toBe("  wymiana  ");
  });
});
