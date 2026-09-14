import { db } from "@/db";
import {
  assertParseableWarehouseQuantity,
  assertPositiveWarehouseQuantity,
  assertSufficientStock,
  signedIssueDelta,
} from "./warehouseQuantity";
import type { WarehouseDb, WarehouseInventoryStore } from "./warehouseTypes";

/**
 * PZ: walidacja ilości → dokument przyjęcia → +stan.
 * Insert dokumentu zostaje w adapterze (inne tabele / FK).
 */
export async function executeWarehouseReceipt<T>(params: {
  store: WarehouseInventoryStore;
  companyId: number;
  skuId: number;
  quantity: string;
  insertReceipt: () => Promise<T>;
  client?: WarehouseDb;
}): Promise<T> {
  const client = params.client ?? db;
  assertPositiveWarehouseQuantity(params.quantity, params.store.fail);
  const row = await params.insertReceipt();
  await params.store.applyDelta(params.companyId, params.skuId, params.quantity, client);
  return row;
}

/**
 * WZ: walidacja ilości → insufficient_stock → dokument wydania → −stan.
 */
export async function executeWarehouseIssue<T>(params: {
  store: WarehouseInventoryStore;
  companyId: number;
  skuId: number;
  quantity: string;
  insertIssue: () => Promise<T>;
  client?: WarehouseDb;
}): Promise<T> {
  const client = params.client ?? db;
  assertPositiveWarehouseQuantity(params.quantity, params.store.fail);
  const current = await params.store.readQuantity(params.companyId, params.skuId, client);
  assertSufficientStock(current, params.quantity, params.store.fail);
  const row = await params.insertIssue();
  await params.store.applyDelta(
    params.companyId,
    params.skuId,
    signedIssueDelta(params.quantity),
    client
  );
  return row;
}

/** Korekta ręczna: parsowalna ilość → upsert bezwzględny. */
export async function executeWarehouseAdjustment(params: {
  store: WarehouseInventoryStore;
  companyId: number;
  skuId: number;
  quantity: string;
  client?: WarehouseDb;
}): Promise<void> {
  const client = params.client ?? db;
  assertParseableWarehouseQuantity(params.quantity, params.store.fail);
  await params.store.setQuantity(params.companyId, params.skuId, params.quantity, client);
}
