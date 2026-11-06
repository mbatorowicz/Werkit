import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GPSManager, type GPSQueueItem } from "@/lib/gpsManager";

const queued: GPSQueueItem[] = [
  {
    lat: 52.2,
    lng: 21.0,
    pointId: "point-123456789",
    sessionId: 1,
    timestamp: "2026-01-01T00:00:00.000Z",
  },
];

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

  it("deletes only explicitly acknowledged IDs belonging to the sent batch", async () => {
    const acknowledge = vi.spyOn(GPSManager, "acknowledge").mockResolvedValue();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          acknowledgedIds: [queued[0].pointId, "another-unsent-point"],
        })
      )
    );
    await GPSManager.flushQueue();
    expect(acknowledge).toHaveBeenCalledWith([queued[0].pointId]);
    expect(GPSManager.clearQueue).not.toHaveBeenCalled();
  });

  it("retains samples after a lost response without a hot retry loop", async () => {
    const acknowledge = vi.spyOn(GPSManager, "acknowledge").mockResolvedValue();
    const fetchSpy = vi.fn().mockRejectedValue(new Error("connection lost"));
    vi.stubGlobal("fetch", fetchSpy);
    await GPSManager.flushQueue();
    await vi.advanceTimersByTimeAsync(1000);
    expect(acknowledge).not.toHaveBeenCalled();
    expect(GPSManager.clearQueue).not.toHaveBeenCalled();
    expect(GPSManager.isFlushing).toBe(false);
  });

  it("przy 403 feature_disabled zachowuje kolejkę i nie retry’uje", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(403, { error: "feature_disabled" }));
    vi.stubGlobal("fetch", fetchSpy);
    const flushSpy = vi.spyOn(GPSManager, "flushQueue");

    await GPSManager.flushQueue();

    expect(GPSManager.clearQueue).not.toHaveBeenCalled();
    expect(flushSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(flushSpy).toHaveBeenCalledTimes(1);
    const gpsPosts = fetchSpy.mock.calls.filter((call) => call[0] === "/api/worker/gps");
    expect(gpsPosts).toHaveLength(1);
  });

  it("przy 403 bez JSON też zachowuje kolejkę", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchSpy);

    await GPSManager.flushQueue();

    expect(GPSManager.clearQueue).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    const gpsPosts = fetchSpy.mock.calls.filter((call) => call[0] === "/api/worker/gps");
    expect(gpsPosts).toHaveLength(1);
  });

  it("sends batches of at most 200 and continues past unacknowledged samples", async () => {
    const many: GPSQueueItem[] = Array.from({ length: 201 }, (_, i) => ({
      pointId: `point-${i}`,
      sessionId: 1,
      lat: 52.2,
      lng: 21.0,
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, i)).toISOString(),
    }));
    vi.spyOn(GPSManager, "getQueue").mockResolvedValue(many);
    const acknowledge = vi.spyOn(GPSManager, "acknowledge").mockResolvedValue();
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { acknowledgedIds: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { acknowledgedIds: [many[200].pointId] }));
    vi.stubGlobal("fetch", fetchSpy);

    await GPSManager.flushQueue();

    const gpsPosts = fetchSpy.mock.calls.filter((call) => call[0] === "/api/worker/gps");
    expect(gpsPosts).toHaveLength(2);
    expect(acknowledge).toHaveBeenLastCalledWith([many[200].pointId]);
    const init = gpsPosts[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as GPSQueueItem[];
    expect(body).toHaveLength(200);
  });
});
