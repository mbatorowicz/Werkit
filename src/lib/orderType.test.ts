import { describe, expect, it } from "vitest";
import { narrowOrderType, resolveOrderType } from "@/lib/orderType";
import { normalizeWorkOrderMaterialFields } from "@/lib/workOrderTypePayload";

describe("orderType", () => {
  it("narrowOrderType zawęża do machine_work lub machine_repair", () => {
    expect(narrowOrderType("machine_repair")).toBe("machine_repair");
    expect(narrowOrderType("machine_work")).toBe("machine_work");
    expect(narrowOrderType("invalid")).toBe("machine_work");
    expect(narrowOrderType(null)).toBe("machine_work");
  });

  it("resolveOrderType preferuje jawny rodzaj z body", () => {
    expect(resolveOrderType("machine_repair", "machine_work")).toBe("machine_repair");
    expect(resolveOrderType(undefined, "machine_repair")).toBe("machine_repair");
    expect(resolveOrderType(null, null)).toBe("machine_work");
  });

  it("normalizeWorkOrderMaterialFields czyści materiał dla naprawy", () => {
    expect(
      normalizeWorkOrderMaterialFields("machine_repair", 5, "12")
    ).toEqual({ materialId: null, quantityTons: null });
    expect(normalizeWorkOrderMaterialFields("machine_work", 5, "12")).toEqual({
      materialId: 5,
      quantityTons: "12",
    });
    expect(normalizeWorkOrderMaterialFields("machine_work", 5, "12,5")).toEqual({
      materialId: 5,
      quantityTons: "12.5",
    });
  });
});
