/** Kody reguł stanu wspólne dla obu magazynów (materiały i części). */
export type WarehouseStockRuleCode = "invalid_quantity" | "insufficient_stock";

/**
 * Błąd jądra magazynu. Adaptery rzucają podklasy (`StockMovementError`,
 * `MaterialStockMovementError`), żeby API dalej łapało `instanceof` per SKU.
 */
export class WarehouseStockError extends Error {
  constructor(
    public readonly code: string,
    message?: string
  ) {
    super(message ?? code);
    this.name = "WarehouseStockError";
  }
}
