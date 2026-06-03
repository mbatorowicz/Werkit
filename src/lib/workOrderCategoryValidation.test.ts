import { describe, expect, it } from "vitest";
import { validateWorkOrderFieldsAgainstCategory } from "./workOrderCategoryValidation";

const baseCat = {
  reqCustomer: false,
  reqMaterial: false,
  reqQuantity: false,
  reqTaskDescription: false,
};

describe("validateWorkOrderFieldsAgainstCategory", () => {
  it("machine_repair + reqTaskDescription akceptuje repairDescription", () => {
    expect(
      validateWorkOrderFieldsAgainstCategory(
        { ...baseCat, reqTaskDescription: true, orderType: "machine_repair" },
        { repairDescription: "Test", taskDescription: null }
      )
    ).toBe("ok");
  });

  it("machine_repair + reqTaskDescription odrzuca pusty repairDescription", () => {
    expect(
      validateWorkOrderFieldsAgainstCategory(
        { ...baseCat, reqTaskDescription: true, orderType: "machine_repair" },
        { repairDescription: "  ", taskDescription: "ignored" }
      )
    ).toBe("missing_task_description");
  });

  it("machine_repair + reqMaterial wymaga materiału gdy kategoria tak ustawiona", () => {
    expect(
      validateWorkOrderFieldsAgainstCategory(
        {
          ...baseCat,
          reqMaterial: true,
          orderType: "machine_repair",
        },
        { materialId: null, quantityTons: null }
      )
    ).toBe("missing_material");

    expect(
      validateWorkOrderFieldsAgainstCategory(
        {
          ...baseCat,
          reqMaterial: true,
          orderType: "machine_repair",
        },
        { materialId: 1, quantityTons: null }
      )
    ).toBe("ok");
  });

  it("machine_work + reqTaskDescription wymaga taskDescription", () => {
    expect(
      validateWorkOrderFieldsAgainstCategory(
        { ...baseCat, reqTaskDescription: true, orderType: "machine_work" },
        { taskDescription: "Opis pracy" }
      )
    ).toBe("ok");

    expect(
      validateWorkOrderFieldsAgainstCategory(
        { ...baseCat, reqTaskDescription: true, orderType: "machine_work" },
        { repairDescription: "only repair", taskDescription: null }
      )
    ).toBe("missing_task_description");
  });

  it("orderType z payload ma pierwszeństwo przed kategorią", () => {
    expect(
      validateWorkOrderFieldsAgainstCategory(
        { ...baseCat, reqTaskDescription: true, orderType: "machine_work" },
        { orderType: "machine_repair", repairDescription: "Naprawa" }
      )
    ).toBe("ok");
  });
});
