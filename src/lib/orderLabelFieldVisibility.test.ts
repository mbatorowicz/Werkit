import { describe, expect, it } from "vitest";
import {
  orderLabelDescriptionText,
  resolveOrderLabelFieldVisibility,
} from "./orderLabelFieldVisibility";

describe("resolveOrderLabelFieldVisibility", () => {
  it("ukrywa materiał i ilość dla machine_repair", () => {
    const vis = resolveOrderLabelFieldVisibility({
      orderType: "machine_repair",
      showMaterial: true,
      showQuantity: true,
      showCustomer: false,
      showTaskDescription: false,
    });
    expect(vis.showMaterial).toBe(false);
    expect(vis.showQuantity).toBe(false);
    expect(vis.showCustomer).toBe(false);
    expect(vis.showDescription).toBe(true);
    expect(vis.descriptionLabel).toContain("napraw");
  });

  it("respektuje flagi kategorii dla machine_work", () => {
    const vis = resolveOrderLabelFieldVisibility({
      orderType: "machine_work",
      showMaterial: false,
      showCustomer: true,
      showQuantity: false,
      showTaskDescription: true,
    });
    expect(vis.showMaterial).toBe(false);
    expect(vis.showQuantity).toBe(false);
    expect(vis.showCustomer).toBe(true);
    expect(vis.showDescription).toBe(true);
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
