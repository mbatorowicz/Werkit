import { describe, expect, it } from "vitest";
import { MaterialStockMovementError } from "@/services/materials/MaterialStockMovementError";
import { StockMovementError } from "@/services/dur/StockMovementError";
import { WarehouseStockError } from "../warehouseError";
import { materialsInventoryStore } from "./materialsStore";
import { sparePartsInventoryStore } from "./sparePartsStore";

describe("adaptery magazynu", () => {
  it("części rzucają StockMovementError, materiały MaterialStockMovementError", () => {
    expect(sparePartsInventoryStore.kind).toBe("spare_part");
    expect(materialsInventoryStore.kind).toBe("material");

    expect(() => sparePartsInventoryStore.fail("insufficient_stock")).toThrow(StockMovementError);
    expect(() => sparePartsInventoryStore.fail("insufficient_stock")).toThrow(WarehouseStockError);
    expect(() => materialsInventoryStore.fail("invalid_quantity")).toThrow(
      MaterialStockMovementError
    );
  });
});
