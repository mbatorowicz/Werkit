import { WarehouseStockError } from "@/services/warehouse/warehouseError";

/** Błąd domenowy ruchów magazynowych części (kod → i18n `dur.apiErrors`). */
export class StockMovementError extends WarehouseStockError {
  constructor(code: string, message?: string) {
    super(code, message);
    this.name = "StockMovementError";
  }
}
