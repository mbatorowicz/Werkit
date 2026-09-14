import { MaterialStockMovementError } from "@/services/materials/MaterialStockMovementError";
import { createWarehouseInventoryStore } from "../warehouseStock";
import type { WarehouseStockRuleCode } from "../warehouseError";

export const materialsInventoryStore = createWarehouseInventoryStore({
  kind: "material",
  fail: (code: WarehouseStockRuleCode): never => {
    throw new MaterialStockMovementError(code);
  },
});
