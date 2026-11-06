import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/types/worker";

const { addWatcher, removeWatcher, isNativePlatform, clearQueue } = vi.hoisted(() => ({
  addWatcher: vi.fn().mockResolvedValue("watcher-1"),
  removeWatcher: vi.fn(),
  isNativePlatform: vi.fn(() => true),
  clearQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}));

vi.mock("@/features/worker/gps/backgroundGeolocationSingleton", () => ({
  backgroundGeolocation: {
    addWatcher: (...args: unknown[]) => addWatcher(...args),
    removeWatcher: (...args: unknown[]) => removeWatcher(...args),
  },
}));

vi.mock("@/lib/gpsManager", () => ({
  GPS_STOP_EVENT: "werkit-gps-stop",
  GPSManager: {
    isStopped: vi.fn().mockResolvedValue(false),
    enqueue: vi.fn().mockResolvedValue({ pointId: "test" }),
    flushQueue: vi.fn(),
    clearQueue,
  },
}));

vi.mock("@/lib/remoteLogger", () => ({
  sendRemoteLog: vi.fn(),
}));

vi.mock("@/features/worker/gps/batteryOptimization", () => ({
  requestIgnoreBatteryOptimizationsIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

import { useWorkerGPS } from "@/features/worker/hooks/useWorkerGPS";
import { GPSManager } from "@/lib/gpsManager";

const session: Session = {
  id: 1,
  startTime: "2026-01-01T08:00:00.000Z",
  categoryId: 1,
  categoryName: "Transport",
  status: "IN_PROGRESS",
  gpsPolicy: "track",
};

describe("useWorkerGPS", () => {
  beforeEach(() => {
    addWatcher.mockClear();
    removeWatcher.mockClear();
    clearQueue.mockClear();
    isNativePlatform.mockReturnValue(true);
    vi.mocked(GPSManager.isStopped).mockResolvedValue(false);
    addWatcher.mockResolvedValue("watcher-1");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stops the watcher immediately after a durable local end signal", async () => {
    renderHook(() => useWorkerGPS(session, vi.fn(), vi.fn(), vi.fn(), true));
    await waitFor(() => expect(addWatcher).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new CustomEvent("werkit-gps-stop", { detail: session.id }));
    await waitFor(() => expect(removeWatcher).toHaveBeenCalledWith({ id: "watcher-1" }));
    expect(clearQueue).not.toHaveBeenCalled();
  });

  it("does not restart an ended session from stale server state", async () => {
    vi.mocked(GPSManager.isStopped).mockResolvedValue(true);
    renderHook(() => useWorkerGPS(session, vi.fn(), vi.fn(), vi.fn(), true));
    await waitFor(() => expect(GPSManager.isStopped).toHaveBeenCalledWith(session.id));
    expect(addWatcher).not.toHaveBeenCalled();
  });

  it("removes a native watcher that finishes registering after stop", async () => {
    let resolveWatcher!: (id: string) => void;
    addWatcher.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveWatcher = resolve;
      })
    );
    renderHook(() => useWorkerGPS(session, vi.fn(), vi.fn(), vi.fn(), true));
    await waitFor(() => expect(addWatcher).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new CustomEvent("werkit-gps-stop", { detail: session.id }));
    resolveWatcher("late-watcher");
    await waitFor(() => expect(removeWatcher).toHaveBeenCalledWith({ id: "late-watcher" }));
  });

  it("nie woła native API gdy gpsTrackingEnabled jest false", async () => {
    const setGpsStatus = vi.fn();
    renderHook(() => useWorkerGPS(session, vi.fn(), vi.fn(), setGpsStatus, false));

    await waitFor(() => {
      expect(setGpsStatus).toHaveBeenCalledWith("active");
    });
    expect(addWatcher).not.toHaveBeenCalled();
    expect(clearQueue).not.toHaveBeenCalled();
  });

  it("nie woła native API gdy gpsPolicy jest stationary", async () => {
    renderHook(() =>
      useWorkerGPS({ ...session, gpsPolicy: "stationary" }, vi.fn(), vi.fn(), vi.fn(), true)
    );

    await waitFor(() => {
      expect(addWatcher).not.toHaveBeenCalled();
    });
    expect(clearQueue).not.toHaveBeenCalled();
  });

  it("nie woła native API gdy legacy categoryIsStationary jest true (fallback gpsPolicy)", async () => {
    renderHook(() =>
      useWorkerGPS(
        { ...session, gpsPolicy: undefined, categoryIsStationary: true },
        vi.fn(),
        vi.fn(),
        vi.fn(),
        true
      )
    );

    await waitFor(() => {
      expect(addWatcher).not.toHaveBeenCalled();
    });
  });

  it("uruchamia BackgroundGeolocation gdy śledzenie jest włączone", async () => {
    renderHook(() => useWorkerGPS(session, vi.fn(), vi.fn(), vi.fn(), true));

    await waitFor(() => {
      expect(addWatcher).toHaveBeenCalledTimes(1);
    });
  });

  it("na web odrzuca próbkę z accuracy > 40 m", async () => {
    isNativePlatform.mockReturnValue(false);
    const setLocation = vi.fn();
    const clearWatch = vi.fn();
    const watchPosition = vi.fn((success: (pos: GeolocationPosition) => void) => {
      success({
        coords: {
          latitude: 52.2,
          longitude: 21.0,
          accuracy: 80,
          heading: null,
          altitude: null,
          altitudeAccuracy: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition);
      return 11;
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
    });

    const { unmount } = renderHook(() =>
      useWorkerGPS(session, setLocation, vi.fn(), vi.fn(), true)
    );

    await waitFor(() => {
      expect(watchPosition).toHaveBeenCalled();
    });
    expect(setLocation).not.toHaveBeenCalled();
    unmount();
    expect(clearWatch).toHaveBeenCalled();
  });

  it("na web przyjmuje próbkę z accuracy ≤ 40 m", async () => {
    isNativePlatform.mockReturnValue(false);
    const setLocation = vi.fn();
    const watchPosition = vi.fn((success: (pos: GeolocationPosition) => void) => {
      success({
        coords: {
          latitude: 52.2,
          longitude: 21.0,
          accuracy: 15,
          heading: 90,
          altitude: null,
          altitudeAccuracy: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition);
      return 12;
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch: vi.fn() },
    });

    renderHook(() => useWorkerGPS(session, setLocation, vi.fn(), vi.fn(), true));

    await waitFor(() => {
      expect(setLocation).toHaveBeenCalledWith({ lat: 52.2, lng: 21.0, heading: 90 });
    });
  });
});
