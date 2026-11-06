import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { sendPartPickRequest, readPendingPartPick } from "./partPickRequest";
import { preparePartPick, acknowledgePartPick } from "./partPickStore";
const state = vi.hoisted(() => ({ owner: "1:2", send: vi.fn(), readOwner: vi.fn() }));
vi.mock("./fetchWithDeviceTelemetry", () => ({ fetchWithDeviceTelemetry: state.send }));
vi.mock("./offlineOwner", () => ({ requireOfflineOwner: () => state.readOwner() }));
const url = "/api/worker/work-orders/5/spare-parts";
const body = '{"partId":1,"quantity":"1","notes":"repair"}';
const pick = (payload = body) => sendPartPickRequest("test", url, payload, "orders");
const key = (n: number) => new Headers(state.send.mock.calls[n][2]?.headers).get("Idempotency-Key");
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  state.owner = "1:2";
  state.readOwner.mockReset().mockImplementation(() => state.owner);
  state.send.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
it("restores exact body and key after a new module instance with no tab storage", async () => {
  state.send.mockRejectedValueOnce(new Error("network"));
  await expect(pick()).rejects.toThrow("network");
  vi.resetModules();
  const restarted = await import("./partPickRequest");
  expect((await restarted.readPendingPartPick(url))?.body).toBe(body);
  state.send.mockResolvedValue(new Response("{}", { status: 200 }));
  await restarted.sendPartPickRequest("test", url, body, "orders");
  expect(key(0)).toBe(key(1));
  expect(await restarted.readPendingPartPick(url)).toBeNull();
  await pick();
  expect(key(2)).not.toBe(key(1));
});
it("isolates A, B and another company; returning to A reuses its pending request", async () => {
  state.send.mockResolvedValue(new Response("{}", { status: 500 }));
  await pick();
  const a = key(0);
  state.owner = "1:3";
  expect(await readPendingPartPick(url)).toBeNull();
  await pick();
  expect(key(1)).not.toBe(a);
  expect(new Headers(state.send.mock.calls[1][2].headers).get("X-Werkit-Offline-Owner")).toBe(
    "1:3"
  );
  state.owner = "2:2";
  expect(await readPendingPartPick(url)).toBeNull();
  state.owner = "1:2";
  await pick();
  expect(key(2)).toBe(a);
});
it("keeps the key for server failures, conflicts, auth failures and timeouts", async () => {
  for (const status of [500, 409, 401, 408]) {
    state.send.mockResolvedValueOnce(new Response("{}", { status }));
    await pick();
  }
  expect(new Set([0, 1, 2, 3].map(key)).size).toBe(1);
  expect(await readPendingPartPick(url)).not.toBeNull();
});
it("blocks changed details while the previous request is uncertain", async () => {
  state.send.mockRejectedValueOnce(new Error("network"));
  await expect(pick()).rejects.toThrow();
  await expect(pick('{"partId":2}')).rejects.toThrow("part_pick_pending");
  expect(state.send).toHaveBeenCalledTimes(1);
});
it("does not send without committed persistent storage", async () => {
  vi.stubGlobal("indexedDB", {
    open: () => {
      throw new Error("blocked");
    },
  });
  await expect(pick()).rejects.toThrow("blocked");
  expect(state.send).not.toHaveBeenCalled();
});
it("releases a definitively rejected request", async () => {
  state.send.mockResolvedValue(new Response("{}", { status: 400 }));
  await pick();
  expect(await readPendingPartPick(url)).toBeNull();
});
it("atomically shares one intent across simultaneous clients without Web Locks", async () => {
  state.send.mockResolvedValue(new Response("{}", { status: 500 }));
  await Promise.all(Array.from({ length: 8 }, () => pick()));
  expect(new Set(Array.from({ length: 8 }, (_, i) => key(i))).size).toBe(1);
});
it("stops before sending if account changes during the storage operation", async () => {
  state.readOwner.mockReturnValueOnce("1:2").mockReturnValueOnce("1:3");
  await expect(pick()).rejects.toThrow("offline_account_mismatch");
  expect(state.send).not.toHaveBeenCalled();
  expect(await readPendingPartPick(url)).not.toBeNull();
});
it("does not delete another account or newer intent on late acknowledgement", async () => {
  const a = await preparePartPick("1:2", url, body);
  await preparePartPick("1:3", url, body);
  await acknowledgePartPick("1:2", url, a!.operationId);
  const newer = await preparePartPick("1:2", url, body);
  await acknowledgePartPick("1:2", url, a!.operationId);
  expect((await readPendingPartPick(url))?.operationId).toBe(newer!.operationId);
  state.owner = "1:3";
  expect(await readPendingPartPick(url)).not.toBeNull();
});
it("does not adopt a legacy unowned tab request", async () => {
  vi.stubGlobal("sessionStorage", { getItem: () => '{"operationId":"legacy"}' });
  await expect(pick()).rejects.toThrow("part_pick_legacy");
  expect(state.send).not.toHaveBeenCalled();
  expect(await readPendingPartPick(url)).toBeNull();
});
it("does not expose a recovered payload when the account changes during reading", async () => {
  await preparePartPick("1:2", url, body);
  state.readOwner.mockReturnValueOnce("1:2").mockReturnValueOnce("1:3");
  await expect(readPendingPartPick(url)).rejects.toThrow("offline_account_mismatch");
});
