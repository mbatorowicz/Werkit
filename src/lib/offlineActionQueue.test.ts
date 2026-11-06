import { afterEach, describe, expect, it, vi } from "vitest";
import { offlineActionQueue } from "./offlineActionQueue";
vi.mock("@/lib/remoteLogger", () => ({ sendRemoteLog: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
describe("offline queue", () => {
  it("uses the shared browser lock for coordination between tabs", async () => {
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => callback());
    vi.stubGlobal("navigator", { locks: { request } });
    vi.spyOn(offlineActionQueue, "getAll").mockResolvedValue([]);
    vi.spyOn(offlineActionQueue, "getCount").mockResolvedValue(0);
    await offlineActionQueue.flushAll();
    expect(request).toHaveBeenCalledWith("werkit-offline-flush", expect.any(Function));
    vi.unstubAllGlobals();
  });
  it("sends a stable operation ID on every retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await offlineActionQueue.executeAction(
      "save_note",
      { sessionId: 1, note: "x" },
      "stable-id-123"
    );
    await offlineActionQueue.executeAction(
      "save_note",
      { sessionId: 1, note: "x" },
      "stable-id-123"
    );
    expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).operationId).toBe("stable-id-123");
    vi.unstubAllGlobals();
  });
  it("retains a rejected action and stops dependent actions", async () => {
    vi.spyOn(offlineActionQueue, "getAll").mockResolvedValue(
      [1, 2].map((id) => ({
        id: String(id),
        protocolVersion: 2,
        type: "save_note",
        payload: { sessionId: 5 },
        createdAt: String(id),
        retryCount: 0,
        maxRetries: 5,
      }))
    );
    vi.spyOn(offlineActionQueue, "getCount").mockResolvedValue(2);
    const execute = vi
      .spyOn(offlineActionQueue, "executeAction")
      .mockResolvedValue(new Response(null, { status: 400 }));
    const remove = vi.spyOn(offlineActionQueue, "remove").mockResolvedValue();
    vi.spyOn(offlineActionQueue, "updateRetry").mockResolvedValue();
    await Promise.all([offlineActionQueue.flushAll(), offlineActionQueue.flushAll()]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });
  it("does not report queued success when storage fails", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        throw new Error("storage unavailable");
      },
    });
    await expect(
      offlineActionQueue.enqueueOffline("save_note", { sessionId: 5 })
    ).rejects.toThrow();
    vi.unstubAllGlobals();
  });
});
