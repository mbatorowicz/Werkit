import { describe, expect, it } from "vitest";
import {
  buildWorkOrderDescriptionFields,
  normalizeWorkOrderMaterialFieldsForCategory,
} from "./workOrderCategoryFields";

describe("workOrderCategoryFields", () => {
  it("normalizeWorkOrderMaterialFieldsForCategory respektuje showMaterial/showQuantity", () => {
    expect(
      normalizeWorkOrderMaterialFieldsForCategory(
        { showMaterial: false, showQuantity: false },
        5,
        "12"
      )
    ).toEqual({ materialId: null, quantityTons: null });

    expect(
      normalizeWorkOrderMaterialFieldsForCategory(
        { showMaterial: true, showQuantity: true },
        5,
        "12,5"
      )
    ).toEqual({ materialId: 5, quantityTons: "12.5" });
  });

  it("buildWorkOrderDescriptionFields mapuje opis wg rodzaju zlecenia", () => {
    expect(
      buildWorkOrderDescriptionFields("machine_repair", { showTaskDescription: true }, {
        repairDescription: "Naprawa",
        taskDescription: "ignorowane",
      })
    ).toEqual({ taskDescription: null, repairDescription: "Naprawa" });

    expect(
      buildWorkOrderDescriptionFields("machine_work", { showTaskDescription: false }, {
        taskDescription: "Opis",
      })
    ).toEqual({ taskDescription: null, repairDescription: null });
  });
});
