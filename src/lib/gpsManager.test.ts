import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GPSManager, type GPSQueueItem } from "@/lib/gpsManager";

const queued: GPSQueueItem[] = [{ lat: 52.2, lng: 21.0, timestamp: "2026-01-01T00:00:00.000Z" }];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GPSManager.flushQueue", () => {
  beforeEach(() => {
    GPSManager.isFlushing = false;
    vi.stubGlobal("navigator", { onLine: true });
    vi.useFakeTimers();
    vi.spyOn(GPSManager, "getQueue").mockResolvedValue(queued);
    vi.spyOn(GPSManager, "clearQueue").mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("przy 403 feature_disabled czyści kolejkę i nie retry’uje", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(403, { error: "feature_disabled" }));
    vi.stubGlobal("fetch", fetchSpy);
    const flushSpy = vi.spyOn(GPSManager, "flushQueue");

    await GPSManager.flushQueue();

    expect(GPSManager.clearQueue).toHaveBeenCalledTimes(1);
    expect(flushSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(flushSpy).toHaveBeenCalledTimes(1);
    const gpsPosts = fetchSpy.mock.calls.filter((call) => call[0] === "/api/worker/gps");
    expect(gpsPosts).toHaveLength(1);
  });

  it("przy 403 bez JSON też czyści kolejkę", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchSpy);

    await GPSManager.flushQueue();

    expect(GPSManager.clearQueue).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    const gpsPosts = fetchSpy.mock.calls.filter((call) => call[0] === "/api/worker/gps");
    expect(gpsPosts).toHaveLength(1);
  });

  it("wysyła co najwyżej 200 punktów w jednym POST", async () => {
    const many: GPSQueueItem[] = Array.from({ length: 201 }, (_, i) => ({
      lat: 52.2,
      lng: 21.0,
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, i)).toISOString(),
    }));
    vi.spyOn(GPSManager, "getQueue").mockResolvedValue(many);
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, count: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    await GPSManager.flushQueue();

    const gpsPosts = fetchSpy.mock.calls.filter((call) => call[0] === "/api/worker/gps");
    expect(gpsPosts).toHaveLength(1);
    const init = gpsPosts[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as GPSQueueItem[];
    expect(body).toHaveLength(200);
  });
});
