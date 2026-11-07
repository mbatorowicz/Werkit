import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { renderWithProviders, plDict } from "@/test/renderWithProviders";
import { PendingStockMovements } from "./PendingStockMovements";
import { preparePartPick, readPartPick } from "@/lib/partPickStore";
const state = vi.hoisted(() => ({ owner: "1:2", send: vi.fn() }));
vi.mock("@/lib/offlineOwner", () => ({
  offlineOwner: () => state.owner,
  requireOfflineOwner: () => state.owner,
}));
vi.mock("@/lib/fetchWithDeviceTelemetry", () => ({ fetchWithDeviceTelemetry: state.send }));
const names = new Map([[7, { name: "Testowa część" }]]);
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  state.owner = "1:2";
  state.send.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
it("restores pending detail after remount, isolates B and retries the original ID after returning to A", async () => {
  const url = "/api/dur/stock/receipts";
  const saved = await preparePartPick(
    state.owner,
    url,
    JSON.stringify({
      partId: 7,
      quantity: "2",
      invoiceNumber: "FV-test",
      notes: "unikalna notatka",
    })
  );
  const props = { kind: "dur" as const, names, onSaved: vi.fn() };
  const first = renderWithProviders(<PendingStockMovements {...props} />);
  expect(await screen.findByText("unikalna notatka")).toBeInTheDocument();
  expect(state.send).not.toHaveBeenCalled();
  first.unmount();
  state.owner = "1:9";
  const second = renderWithProviders(<PendingStockMovements {...props} />);
  await waitFor(() => expect(screen.queryByText("unikalna notatka")).not.toBeInTheDocument());
  state.owner = "1:2";
  second.rerender(<PendingStockMovements {...props} />);
  expect(await screen.findByText("FV-test")).toBeInTheDocument();
  state.send.mockResolvedValue(new Response("{}", { status: 200 }));
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: plDict.common.warehouse.retryMovement }));
  await waitFor(() => expect(state.send).toHaveBeenCalledTimes(1));
  expect(new Headers(state.send.mock.calls[0][2].headers).get("Idempotency-Key")).toBe(
    saved!.operationId
  );
  await waitFor(() => expect(props.onSaved).toHaveBeenCalled());
  expect(await readPartPick("1:2", url)).toBeNull();
});
