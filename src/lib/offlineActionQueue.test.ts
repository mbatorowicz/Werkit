import { afterEach, describe, expect, it, vi } from "vitest";
import { offlineActionQueue } from "./offlineActionQueue";
vi.mock("@/lib/remoteLogger", () => ({ sendRemoteLog: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
describe("offline queue", () => {
  it("retains a rejected action and stops dependent actions", async () => {
    vi.spyOn(offlineActionQueue, "getAll").mockResolvedValue(
      [1, 2].map((id) => ({
        id: String(id),
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
