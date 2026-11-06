import { beforeEach, expect, it, vi } from "vitest";
import { POST as workerPost } from "@/app/api/worker/work-orders/[id]/spare-parts/route";
import { POST as adminPost } from "@/app/api/admin/work-orders/[id]/spare-parts/route";
import { WorkOrderSparePartService as Parts } from "@/services/dur/WorkOrderSparePartService";
import { StockMovementError } from "@/services/dur/StockMovementError";
vi.mock("@/lib/apiTenant", () => ({
  requireWorkerCompanySession: vi.fn(async () => ({ ok: true, companyId: 1, userId: 2 })),
  requireCompanyScopedSession: vi.fn(async () => ({
    ok: true,
    data: { companyId: 1, session: { userId: 2 } },
  })),
}));
vi.mock("@/lib/requireAdminMutation", () => ({ guardAdminMutation: vi.fn(async () => null) }));
vi.mock("@/services/PlatformFeatureFlagService", () => ({
  PlatformFeatureFlagService: { getFlags: vi.fn(async () => ({ durEnabled: true })) },
}));
vi.mock("@/services/dur/WorkOrderSparePartService", () => ({
  WorkOrderSparePartService: {
    canWorkerAccessOrder: vi.fn(async () => true),
    verifyOrderBelongsToCompany: vi.fn(async () => true),
    pickPartFromWarehouse: vi.fn(async () => ({ id: 10 })),
  },
}));
beforeEach(() =>
  vi
    .mocked(Parts.pickPartFromWarehouse)
    .mockReset()
    .mockResolvedValue({ id: 10 } as Awaited<ReturnType<typeof Parts.pickPartFromWarehouse>>)
);
for (const [name, post] of [
  ["worker", workerPost],
  ["admin", adminPost],
] as const) {
  const call = (key?: string, owner = "1:2") =>
    post(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Werkit-Offline-Owner": owner,
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: JSON.stringify({ partId: 3, quantity: "1" }),
      }),
      { params: Promise.resolve({ id: "4" }) }
    );
  it(`${name}: rejects another account before issuing`, async () => {
    expect((await call(crypto.randomUUID(), "1:99")).status).toBe(409);
    expect((await call(crypto.randomUUID(), "")).status).toBe(409);
    expect(Parts.pickPartFromWarehouse).not.toHaveBeenCalled();
  });
  it(`${name}: rejects missing or malformed keys before issuing`, async () => {
    expect((await call()).status).toBe(400);
    expect((await call("bad")).status).toBe(400);
    expect(Parts.pickPartFromWarehouse).not.toHaveBeenCalled();
  });
  it(`${name}: forwards the key and reports a conflicting intent as 409`, async () => {
    const key = crypto.randomUUID();
    expect((await call(key)).status).toBe(200);
    expect(vi.mocked(Parts.pickPartFromWarehouse).mock.calls[0][3].operationId).toBe(key);
    vi.mocked(Parts.pickPartFromWarehouse).mockRejectedValueOnce(
      new StockMovementError("operation_conflict")
    );
    expect((await call(key)).status).toBe(409);
  });
}
