import { beforeEach, expect, it, vi } from "vitest";
const execute = vi.hoisted(() => vi.fn(async () => ({ id: 1 })));
vi.mock("@/services/warehouse/ManualStockMovementService", () => ({
  ManualStockMovementService: { execute },
}));
vi.mock("@/lib/apiTenant", () => ({
  requireCompanyScopedSession: async () => ({
    ok: true,
    data: { companyId: 1, session: { userId: 2 } },
  }),
}));
vi.mock("@/lib/requireAdminMutation", () => ({ guardAdminMutation: async () => null }));
vi.mock("@/lib/requireDurFeature", () => ({ requireDurFeature: async () => ({ ok: true }) }));
vi.mock("@/services/dur/StockMovementService", () => ({ StockMovementService: {} }));
vi.mock("@/services/materials/MaterialStockMovementService", () => ({
  MaterialStockMovementService: {},
}));
import { POST as dr } from "@/app/api/dur/stock/receipts/route";
import { POST as di } from "@/app/api/dur/stock/issues/route";
import { POST as mr } from "@/app/api/materials/stock/receipts/route";
import { POST as mi } from "@/app/api/materials/stock/issues/route";
import { ApiRouteError } from "./apiRoute";
beforeEach(() => execute.mockReset().mockResolvedValue({ id: 1 }));
for (const [name, post] of [
  ["dur:receipts", dr],
  ["dur:issues", di],
  ["materials:receipts", mr],
  ["materials:issues", mi],
] as const) {
  const call = (owner = "1:2", key = "test-operation-123") =>
    post(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Werkit-Offline-Owner": owner,
          "Idempotency-Key": key,
        },
        body: JSON.stringify({ partId: 3, materialId: 4, quantity: "2" }),
      }),
      {}
    );
  it(`${name}: fails closed for stale/missing owners and missing keys`, async () => {
    expect((await call("1:9")).status).toBe(409);
    expect((await call("")).status).toBe(409);
    expect((await call("1:2", "")).status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
  it(`${name}: scopes the receipt and returns conflict without treating it as success`, async () => {
    expect((await call()).status).toBe(200);
    expect(execute.mock.calls[0].slice(0, 4)).toEqual([1, 2, "test-operation-123", name]);
    execute.mockRejectedValueOnce(new ApiRouteError("operation_conflict", 409));
    expect((await call()).status).toBe(409);
  });
}
