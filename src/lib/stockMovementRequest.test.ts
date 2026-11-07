import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { readPartPick } from "./partPickStore";
import { sendStockMovement } from "./stockMovementRequest";
const state = vi.hoisted(() => ({ owner: "1:2", send: vi.fn() }));
vi.mock("./offlineOwner", () => ({ requireOfflineOwner: () => state.owner }));
vi.mock("./fetchWithDeviceTelemetry", () => ({ fetchWithDeviceTelemetry: state.send }));
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("window", new EventTarget());
  state.owner = "1:2";
  state.send.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
for (const kind of ["dur", "materials"])
  for (const type of ["receipts", "issues"]) {
    const url = `/api/${kind}/stock/${type}`;
    it(`${kind}/${type}: lost response, module restart and A-B-A retain exact request`, async () => {
      state.send.mockRejectedValueOnce(new TypeError("lost response"));
      const body = JSON.stringify({
        quantity: "2",
        notes: "test",
        [kind === "dur" ? "partId" : "materialId"]: 3,
      });
      await expect(sendStockMovement(url, body, state.owner)).rejects.toThrow();
      const saved = await readPartPick(state.owner, url);
      expect(saved).not.toBeNull();
      vi.resetModules();
      const restarted = await import("./stockMovementRequest");
      state.owner = "1:9";
      expect(await readPartPick(state.owner, url)).toBeNull();
      await expect(restarted.retryStockMovement(saved!)).rejects.toThrow(
        "offline_account_mismatch"
      );
      await expect(restarted.sendStockMovement(url, body, "1:2")).rejects.toThrow(
        "offline_account_mismatch"
      );
      state.owner = "1:2";
      state.send.mockResolvedValue(new Response("{}", { status: 200 }));
      await restarted.retryStockMovement(saved!);
      expect(new Headers(state.send.mock.calls[1][2].headers).get("Idempotency-Key")).toBe(
        saved!.operationId
      );
      expect(state.send.mock.calls[1][2].body).toBe(body);
      expect(await readPartPick(state.owner, url)).toBeNull();
      // Another tab kept this saved intent before the first tab received its ack.
      await restarted.retryStockMovement(saved!);
      expect(new Headers(state.send.mock.calls[2][2].headers).get("Idempotency-Key")).toBe(
        saved!.operationId
      );
    });
  }
it("persists conflicts and refuses editing unresolved movement", async () => {
  const url = "/api/dur/stock/issues";
  state.send.mockResolvedValue(new Response("{}", { status: 409 }));
  await sendStockMovement(url, '{"partId":1}', state.owner);
  await expect(sendStockMovement(url, '{"partId":2}', state.owner)).rejects.toThrow(
    "stock_movement_pending"
  );
  expect(await readPartPick(state.owner, url)).not.toBeNull();
  expect(state.send).toHaveBeenCalledTimes(1);
});
it("does not send when durable storage is unavailable", async () => {
  vi.stubGlobal("indexedDB", {
    open() {
      throw new Error("storage blocked");
    },
  });
  await expect(sendStockMovement("/api/dur/stock/receipts", "{}", state.owner)).rejects.toThrow();
  expect(state.send).not.toHaveBeenCalled();
});
