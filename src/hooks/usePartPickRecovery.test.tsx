import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { usePartPickRecovery } from "./usePartPickRecovery";
import { readPendingPartPick } from "@/lib/partPickRequest";
const state = vi.hoisted(() => ({ owner: "1:2" }));
vi.mock("@/lib/offlineOwner", () => ({ offlineOwner: () => state.owner }));
vi.mock("@/lib/partPickRequest", () => ({ readPendingPartPick: vi.fn() }));
const record = {
  scope: "test",
  owner: "1:2",
  url: "/api/worker/work-orders/5/spare-parts",
  operationId: "same-operation",
  body: JSON.stringify({ partId: 7, quantity: "2.5", notes: "repair", unitPrice: "10" }),
};
const setters = () => ({
  setSelectedPartId: vi.fn(),
  setAddQuantity: vi.fn(),
  setAddNotes: vi.fn(),
  setShowAddForm: vi.fn(),
  setAddUnitPrice: vi.fn(),
});
beforeEach(() => {
  state.owner = "1:2";
  vi.mocked(readPendingPartPick).mockReset();
});
it("restores a pending form on mount without submitting", async () => {
  vi.mocked(readPendingPartPick).mockResolvedValue(record);
  const fields = setters();
  renderHook(() => usePartPickRecovery(record.url, fields));
  await waitFor(() => expect(fields.setShowAddForm).toHaveBeenCalledWith(true));
  expect(fields.setSelectedPartId).toHaveBeenCalledWith("7");
  expect(fields.setAddQuantity).toHaveBeenCalledWith("2.5");
  expect(fields.setAddNotes).toHaveBeenCalledWith("repair");
  expect(fields.setAddUnitPrice).toHaveBeenCalledWith("10");
});
it("ignores late recovery after an account switch", async () => {
  let resolve!: (value: typeof record) => void;
  vi.mocked(readPendingPartPick).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  const fields = setters();
  renderHook(() => usePartPickRecovery(record.url, fields));
  state.owner = "1:3";
  resolve(record);
  await new Promise((r) => setTimeout(r, 0));
  expect(fields.setSelectedPartId).not.toHaveBeenCalled();
});
it("does not overwrite another order with a late recovery", async () => {
  let resolve!: (value: typeof record) => void;
  vi.mocked(readPendingPartPick)
    .mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    )
    .mockResolvedValue(null);
  const fields = setters();
  const hook = renderHook(({ url }) => usePartPickRecovery(url, fields), {
    initialProps: { url: record.url },
  });
  hook.rerender({ url: "/api/worker/work-orders/6/spare-parts" });
  resolve(record);
  await new Promise((r) => setTimeout(r, 0));
  expect(fields.setSelectedPartId).not.toHaveBeenCalled();
});
