import { describe, expect, it } from "vitest";
import { WarehouseStockError } from "./warehouseError";
import {
  assertParseableWarehouseQuantity,
  assertPositiveWarehouseQuantity,
  assertSufficientStock,
  hasSufficientStock,
  signedIssueDelta,
} from "./warehouseQuantity";

const fail = (code: "invalid_quantity" | "insufficient_stock"): never => {
  throw new WarehouseStockError(code);
};

describe("warehouseQuantity", () => {
  it("odrzuca zero, ujemne i nie-liczbę jako invalid_quantity", () => {
    expect(() => assertPositiveWarehouseQuantity("0", fail)).toThrow("invalid_quantity");
    expect(() => assertPositiveWarehouseQuantity("-1", fail)).toThrow("invalid_quantity");
    expect(() => assertPositiveWarehouseQuantity("abc", fail)).toThrow("invalid_quantity");
  });

  it("akceptuje dodatnią ilość z przecinkiem", () => {
    expect(() => assertPositiveWarehouseQuantity("3,25", fail)).not.toThrow();
  });

  it("korekta akceptuje zero, odrzuca nie-liczbę", () => {
    expect(() => assertParseableWarehouseQuantity("0", fail)).not.toThrow();
    expect(() => assertParseableWarehouseQuantity("7.25", fail)).not.toThrow();
    expect(() => assertParseableWarehouseQuantity("abc", fail)).toThrow("invalid_quantity");
  });

  it("insufficient_stock gdy brak wiersza albo za mało na stanie", () => {
    expect(hasSufficientStock(null, "1")).toBe(false);
    expect(hasSufficientStock("7.25", "7.25")).toBe(true);
    expect(hasSufficientStock("7.24", "7.25")).toBe(false);
    expect(() => assertSufficientStock("1", "2", fail)).toThrow("insufficient_stock");
  });

  it("signedIssueDelta jest ujemną deltą WZ", () => {
    expect(signedIssueDelta("3.25")).toBe("-3.25");
  });
});
