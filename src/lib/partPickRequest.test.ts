import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { sendPartPickRequest } from "./partPickRequest";
import { fetchWithDeviceTelemetry } from "./fetchWithDeviceTelemetry";
vi.mock("./fetchWithDeviceTelemetry", () => ({ fetchWithDeviceTelemetry: vi.fn() }));
const send = vi.mocked(fetchWithDeviceTelemetry);
let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  send.mockReset();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());
const pick = (body = '{"partId":1,"quantity":"1"}') =>
  sendPartPickRequest("test", "/api/worker/work-orders/5/spare-parts", body, "orders");
const key = (n: number) => new Headers(send.mock.calls[n][2]?.headers).get("Idempotency-Key");
it("retains the key after a lost response and rotates only after success", async () => {
  send.mockRejectedValueOnce(new Error("network"));
  await expect(pick()).rejects.toThrow("network");
  expect(stored.size).toBe(1);
  send.mockResolvedValue(new Response("{}", { status: 200 }));
  await pick();
  expect(key(0)).toBe(key(1));
  expect(stored.size).toBe(0);
  await pick();
  expect(key(2)).not.toBe(key(1));
});
it("keeps the key after server failure and conflict", async () => {
  send.mockResolvedValueOnce(new Response("{}", { status: 500 }));
  await pick();
  send.mockResolvedValueOnce(new Response("{}", { status: 409 }));
  await pick();
  expect(key(0)).toBe(key(1));
  expect(stored.size).toBe(1);
});
it("blocks changed details while the previous request is uncertain", async () => {
  send.mockRejectedValueOnce(new Error("network"));
  await expect(pick()).rejects.toThrow();
  await expect(pick('{"partId":2}')).rejects.toThrow("part_pick_pending");
  expect(send).toHaveBeenCalledTimes(1);
});
it("does not send when durable tab storage is unavailable", async () => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
  });
  await expect(pick()).rejects.toThrow("blocked");
  expect(send).not.toHaveBeenCalled();
});
it("releases a definitively rejected request", async () => {
  send.mockResolvedValue(new Response("{}", { status: 400 }));
  await pick();
  expect(stored.size).toBe(0);
});

it("retains an uncertain request across authentication failure and timeout", async () => {
  send.mockResolvedValueOnce(new Response("{}", { status: 401 }));
  await pick();
  send.mockResolvedValueOnce(new Response("{}", { status: 408 }));
  await pick();
  expect(key(0)).toBe(key(1));
  expect(stored.size).toBe(1);
});
