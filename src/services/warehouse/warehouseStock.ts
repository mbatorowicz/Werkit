import { db } from "@/db";
import { materialInventory, sparePartInventory } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type {
  WarehouseDb,
  WarehouseFail,
  WarehouseInventoryStore,
  WarehouseSkuKind,
} from "./warehouseTypes";

function stockPlusSql(
  quantityColumn: typeof sparePartInventory.quantity | typeof materialInventory.quantity,
  delta: string
) {
  return sql`CAST(${quantityColumn} AS numeric) + CAST(${delta} AS numeric)`;
}

function quantityOrNull(value: unknown): string | null {
  return value == null ? null : String(value);
}

export async function readWarehouseQuantity(
  kind: WarehouseSkuKind,
  companyId: number,
  skuId: number,
  client: WarehouseDb = db
): Promise<string | null> {
  if (kind === "spare_part") {
    const [row] = await client
      .select({ quantity: sparePartInventory.quantity })
      .from(sparePartInventory)
      .where(and(eq(sparePartInventory.companyId, companyId), eq(sparePartInventory.partId, skuId)))
      .limit(1);
    return quantityOrNull(row?.quantity);
  }

  const [row] = await client
    .select({ quantity: materialInventory.quantity })
    .from(materialInventory)
    .where(and(eq(materialInventory.companyId, companyId), eq(materialInventory.materialId, skuId)))
    .limit(1);
  return quantityOrNull(row?.quantity);
}

/** Upsert stanu: nowy wiersz albo quantity + delta. Jedna reguła dla obu SKU. */
export async function applyWarehouseStockDelta(
  kind: WarehouseSkuKind,
  companyId: number,
  skuId: number,
  delta: string,
  client: WarehouseDb = db
): Promise<void> {
  const now = new Date();
  if (kind === "spare_part") {
    await client
      .insert(sparePartInventory)
      .values({
        companyId,
        partId: skuId,
        quantity: delta,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sparePartInventory.companyId, sparePartInventory.partId],
        set: {
          quantity: stockPlusSql(sparePartInventory.quantity, delta),
          updatedAt: now,
        },
      });
    return;
  }

  await client
    .insert(materialInventory)
    .values({
      companyId,
      materialId: skuId,
      quantity: delta,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [materialInventory.companyId, materialInventory.materialId],
      set: {
        quantity: stockPlusSql(materialInventory.quantity, delta),
        updatedAt: now,
      },
    });
}

/** Korekta bezwzględna (nadpisanie ilości). */
export async function setWarehouseQuantity(
  kind: WarehouseSkuKind,
  companyId: number,
  skuId: number,
  quantity: string,
  client: WarehouseDb = db
): Promise<void> {
  const now = new Date();
  if (kind === "spare_part") {
    await client
      .insert(sparePartInventory)
      .values({
        companyId,
        partId: skuId,
        quantity,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sparePartInventory.companyId, sparePartInventory.partId],
        set: {
          quantity,
          updatedAt: now,
        },
      });
    return;
  }

  await client
    .insert(materialInventory)
    .values({
      companyId,
      materialId: skuId,
      quantity,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [materialInventory.companyId, materialInventory.materialId],
      set: {
        quantity,
        updatedAt: now,
      },
    });
}

export function createWarehouseInventoryStore(opts: {
  kind: WarehouseSkuKind;
  fail: WarehouseFail;
}): WarehouseInventoryStore {
  const { kind, fail } = opts;
  return {
    kind,
    fail,
    readQuantity: (companyId, skuId, client) =>
      readWarehouseQuantity(kind, companyId, skuId, client),
    applyDelta: (companyId, skuId, delta, client) =>
      applyWarehouseStockDelta(kind, companyId, skuId, delta, client),
    setQuantity: (companyId, skuId, quantity, client) =>
      setWarehouseQuantity(kind, companyId, skuId, quantity, client),
  };
}
