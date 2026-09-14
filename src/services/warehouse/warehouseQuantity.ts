import { parseDecimalInput } from "@/lib/decimalInput";
import type { WarehouseStockRuleCode } from "./warehouseError";

type Fail = (code: WarehouseStockRuleCode) => never;

/** Ilość PZ/WZ musi być skończoną liczbą > 0. */
export function assertPositiveWarehouseQuantity(quantity: string, fail: Fail): void {
  const n = parseDecimalInput(quantity);
  if (n == null || n <= 0) fail("invalid_quantity");
}

/** Korekta bezwzględna: liczba (w tym 0), bez NaN. */
export function assertParseableWarehouseQuantity(quantity: string, fail: Fail): void {
  if (parseDecimalInput(quantity) == null) fail("invalid_quantity");
}

export function hasSufficientStock(
  currentQuantity: string | null | undefined,
  needed: string
): boolean {
  const current = currentQuantity != null ? (parseDecimalInput(String(currentQuantity)) ?? 0) : 0;
  const required = parseDecimalInput(needed) ?? 0;
  return current >= required;
}

export function assertSufficientStock(
  currentQuantity: string | null | undefined,
  needed: string,
  fail: Fail
): void {
  if (!hasSufficientStock(currentQuantity, needed)) fail("insufficient_stock");
}

/** Delta WZ: odejmowanie od stanu. */
export function signedIssueDelta(quantity: string): string {
  return `-${quantity}`;
}
