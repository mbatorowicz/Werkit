import { StockMovementError } from "@/services/dur/StockMovementError";
import { createWarehouseInventoryStore } from "../warehouseStock";
import type { WarehouseStockRuleCode } from "../warehouseError";

export const sparePartsInventoryStore = createWarehouseInventoryStore({
  kind: "spare_part",
  fail: (code: WarehouseStockRuleCode): never => {
    throw new StockMovementError(code);
  },
});
