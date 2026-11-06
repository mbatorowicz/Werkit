import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { GPSManager } from "./gpsManager";

describe("durable GPS queue", () => {
  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("werkit_gps_db", 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("gps_queue", { keyPath: "timestamp" });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const tx = req.result.transaction("gps_queue", "readwrite");
        tx.objectStore("gps_queue").add({ timestamp: "legacy", lat: 52, lng: 21 });
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
      };
    });
  });
  it("preserves new samples while acknowledging an older batch", async () => {
    const first = await GPSManager.enqueue({ lat: 52, lng: 21 }, 101);
    expect(first).not.toBeNull();
    const [second] = await Promise.all([
      GPSManager.enqueue({ lat: 52.1, lng: 21.1 }, 102),
      GPSManager.acknowledge([first!.pointId]),
    ]);
    const queue = await GPSManager.getQueue();
    expect(queue.some((p) => p.pointId === first!.pointId)).toBe(false);
    expect(queue.find((p) => p.pointId === second!.pointId)?.sessionId).toBe(102);
    expect(await GPSManager.getLegacyQueue()).toHaveLength(1);
  });
  it("persists stop without deleting queued points and rejects later samples", async () => {
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    vi.stubGlobal(
      "CustomEvent",
      class {
        constructor(public type: string) {}
      }
    );
    vi.stubGlobal("localStorage", { setItem: vi.fn() });
    const before = await GPSManager.enqueue({ lat: 52, lng: 21 }, 103);
    await GPSManager.stopSession(103);
    expect(await GPSManager.isStopped(103)).toBe(true);
    expect(await GPSManager.enqueue({ lat: 53, lng: 22 }, 103)).toBeNull();
    expect((await GPSManager.getQueue()).some((p) => p.pointId === before!.pointId)).toBe(true);
    vi.unstubAllGlobals();
  });
});
