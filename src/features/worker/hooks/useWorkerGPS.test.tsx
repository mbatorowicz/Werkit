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
  GPSManager: {
    enqueue: vi.fn(),
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("nie woła native API gdy gpsTrackingEnabled jest false", async () => {
    const setGpsStatus = vi.fn();
    renderHook(() => useWorkerGPS(session, vi.fn(), vi.fn(), setGpsStatus, false));

    await waitFor(() => {
      expect(setGpsStatus).toHaveBeenCalledWith("active");
    });
    expect(addWatcher).not.toHaveBeenCalled();
    expect(clearQueue).toHaveBeenCalled();
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
