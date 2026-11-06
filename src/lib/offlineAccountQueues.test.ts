import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { offlineActionQueue } from "./offlineActionQueue";
import { GPSManager } from "./gpsManager";
vi.mock("@/lib/remoteLogger", () => ({ sendRemoteLog: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("durable queues across account changes", () => {
  it("keeps A data hidden while B queues/syncs, then syncs A with stable IDs", async () => {
    let owner = "1:1";
    vi.stubGlobal("document", { querySelector: () => ({ content: owner }) });
    vi.stubGlobal("navigator", { onLine: true });
    const a = await offlineActionQueue.enqueueOffline("save_note", { sessionId: 501, note: "A" });
    const pointA = await GPSManager.enqueue({ lat: 52, lng: 21 }, 501);
    owner = "2:2";
    expect(await offlineActionQueue.getAll()).toEqual([]);
    expect(await GPSManager.getQueue()).toEqual([]);
    const b = await offlineActionQueue.enqueueOffline("save_note", { sessionId: 502, note: "B" });
    const sent: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        expect((init.headers as Record<string, string>)["X-Werkit-Offline-Owner"]).toBe(owner);
        const body = JSON.parse(String(init.body));
        if (Array.isArray(body))
          return new Response(JSON.stringify({ acknowledgedIds: body.map((p) => p.pointId) }));
        sent.push(body.operationId);
        return new Response(JSON.stringify({ success: true }));
      })
    );
    await offlineActionQueue.flushAll();
    expect(sent).toEqual([b.id]);
    owner = "1:1";
    expect((await offlineActionQueue.getAll()).map((x) => x.id)).toEqual([a.id]);
    expect((await GPSManager.getQueue()).map((x) => x.pointId)).toEqual([pointA!.pointId]);
    await offlineActionQueue.flushAll();
    await GPSManager.flushQueue();
    expect(sent).toEqual([b.id, a.id]);
    expect(await offlineActionQueue.getAll()).toEqual([]);
    expect(await GPSManager.getQueue()).toEqual([]);
  });
});
