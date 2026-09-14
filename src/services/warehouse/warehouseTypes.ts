import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import type { WarehouseStockRuleCode } from "./warehouseError";

export type WarehouseDb = NodePgDatabase<typeof schema>;

/** Dwa SKU zostają osobnymi tabelami — kind wybiera adapter, nie scala schematu. */
export type WarehouseSkuKind = "material" | "spare_part";

export type WarehouseFail = (code: WarehouseStockRuleCode) => never;

export type WarehouseInventoryStore = {
  kind: WarehouseSkuKind;
  fail: WarehouseFail;
  readQuantity(companyId: number, skuId: number, client: WarehouseDb): Promise<string | null>;
  applyDelta(
    companyId: number,
    skuId: number,
    delta: string,
    client: WarehouseDb
  ): Promise<void>;
  setQuantity(
    companyId: number,
    skuId: number,
    quantity: string,
    client: WarehouseDb
  ): Promise<void>;
};

/** Wspólny kształt dokumentu PZ (bez FK specyficznego dla SKU). */
export type WarehouseReceiptDraft = {
  quantity: string;
  unitPrice?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
};

/** Wspólny kształt dokumentu WZ (bez FK specyficznego dla SKU). */
export type WarehouseIssueDraft = {
  quantity: string;
  workOrderId?: number | null;
  issuedTo?: number | null;
  notes?: string | null;
};
