import { describe, expect, it, vi } from "vitest";
import { WarehouseStockError } from "./warehouseError";
import {
  executeWarehouseAdjustment,
  executeWarehouseIssue,
  executeWarehouseReceipt,
} from "./warehouseMovements";
import type { WarehouseDb, WarehouseInventoryStore } from "./warehouseTypes";

vi.mock("@/db", () => ({ db: {} }));

function mockStore(current: string | null): WarehouseInventoryStore & {
  applyDelta: ReturnType<typeof vi.fn>;
  setQuantity: ReturnType<typeof vi.fn>;
  readQuantity: ReturnType<typeof vi.fn>;
} {
  const applyDelta = vi.fn().mockResolvedValue(undefined);
  const setQuantity = vi.fn().mockResolvedValue(undefined);
  const readQuantity = vi.fn().mockResolvedValue(current);
  return {
    kind: "material",
    fail: (code): never => {
      throw new WarehouseStockError(code);
    },
    readQuantity,
    applyDelta,
    setQuantity,
  };
}

const client = {} as WarehouseDb;

describe("warehouseMovements — jedna reguła stanu", () => {
  it("PZ: odrzuca ilość ≤ 0 i nie wstawia dokumentu", async () => {
    const store = mockStore("10");
    const insertReceipt = vi.fn();
    await expect(
      executeWarehouseReceipt({
        store,
        companyId: 1,
        skuId: 2,
        quantity: "0",
        insertReceipt,
        client,
      })
    ).rejects.toMatchObject({ code: "invalid_quantity" });
    expect(insertReceipt).not.toHaveBeenCalled();
    expect(store.applyDelta).not.toHaveBeenCalled();
  });

  it("PZ: po przyjęciu dodaje deltę dodatnią", async () => {
    const store = mockStore("0");
    const inserted = { id: 9 };
    const row = await executeWarehouseReceipt({
      store,
      companyId: 1,
      skuId: 2,
      quantity: "10.50",
      insertReceipt: async () => inserted,
      client,
    });
    expect(row).toBe(inserted);
    expect(store.applyDelta).toHaveBeenCalledWith(1, 2, "10.50", client);
  });

  it("WZ: brak stanu = insufficient_stock, bez dokumentu i delty", async () => {
    const store = mockStore(null);
    const insertIssue = vi.fn();
    await expect(
      executeWarehouseIssue({
        store,
        companyId: 1,
        skuId: 5,
        quantity: "10",
        insertIssue,
        client,
      })
    ).rejects.toMatchObject({ code: "insufficient_stock" });
    expect(insertIssue).not.toHaveBeenCalled();
    expect(store.applyDelta).not.toHaveBeenCalled();
  });

  it("WZ: po wydaniu odejmuje deltę", async () => {
    const store = mockStore("7.25");
    const inserted = { id: 3 };
    const row = await executeWarehouseIssue({
      store,
      companyId: 1,
      skuId: 5,
      quantity: "3.25",
      insertIssue: async () => inserted,
      client,
    });
    expect(row).toBe(inserted);
    expect(store.applyDelta).toHaveBeenCalledWith(1, 5, "-3.25", client);
  });

  it("korekta: nieparsowalna ilość nie nadpisuje stanu", async () => {
    const store = mockStore("1");
    await expect(
      executeWarehouseAdjustment({
        store,
        companyId: 1,
        skuId: 2,
        quantity: "abc",
        client,
      })
    ).rejects.toMatchObject({ code: "invalid_quantity" });
    expect(store.setQuantity).not.toHaveBeenCalled();
  });

  it("korekta: zapisuje bezwzględną ilość", async () => {
    const store = mockStore("1");
    await executeWarehouseAdjustment({
      store,
      companyId: 1,
      skuId: 2,
      quantity: "0",
      client,
    });
    expect(store.setQuantity).toHaveBeenCalledWith(1, 2, "0", client);
  });
});
