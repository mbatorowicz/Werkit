import { WarehouseStockError } from "@/services/warehouse/warehouseError";

export class MaterialStockMovementError extends WarehouseStockError {
  constructor(code: string, message?: string) {
    super(code, message);
    this.name = "MaterialStockMovementError";
  }
}
