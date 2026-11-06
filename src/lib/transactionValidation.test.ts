import { describe, expect, it, vi } from "vitest";
import type { WarehouseDb } from "@/services/warehouse/warehouseTypes";
const pooled = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Unexpected pooled connection inside transaction");
  })
);
vi.mock("@/db", () => ({ db: { select: pooled } }));
import { assertOrderEntitiesBelongToCompany } from "./tenantContext";
import { validateCategoryForOrder } from "./workOrderCategoryValidation";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";

function transaction(rows: unknown[]) {
  const select = vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }));
  return { client: { select } as unknown as WarehouseDb, select };
}
describe("validation reuses the transaction under saturated pool", () => {
  it("checks every referenced entity without borrowing another connection", async () => {
    const { client, select } = transaction([{ id: 1 }]);
    await assertOrderEntitiesBelongToCompany(
      { userId: 1, resourceId: 2, materialId: 3, customerId: 4 },
      5,
      client
    );
    expect(select).toHaveBeenCalledTimes(4);
    expect(pooled).not.toHaveBeenCalled();
  });
  it("checks category and part through the supplied transaction", async () => {
    const { client } = transaction([
      {
        id: 1,
        isGroup: false,
        reqCustomer: false,
        reqMaterial: false,
        reqQuantity: false,
        reqTaskDescription: false,
      },
    ]);
    await expect(validateCategoryForOrder(1, 1, {}, client)).resolves.toEqual({ ok: true });
    await expect(WorkOrderSparePartService.assertPartBelongsToCompany(1, 1, client)).resolves.toBe(
      true
    );
    expect(pooled).not.toHaveBeenCalled();
  });
  it("still rejects foreign or missing references", async () => {
    const { client } = transaction([]);
    await expect(assertOrderEntitiesBelongToCompany({ resourceId: 2 }, 1, client)).rejects.toThrow(
      "nie należy"
    );
    await expect(validateCategoryForOrder(1, 2, {}, client)).rejects.toThrow("invalid_category");
    await expect(WorkOrderSparePartService.assertPartBelongsToCompany(2, 1, client)).resolves.toBe(
      false
    );
  });
});
