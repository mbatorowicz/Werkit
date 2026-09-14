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

import { useWorkerGPS } from "@/features/worker/hooks/useWorkerGPS";

const session: Session = {
  id: 1,
  startTime: "2026-01-01T08:00:00.000Z",
  categoryId: 1,
  categoryName: "Transport",
  status: "IN_PROGRESS",
  categoryIsStationary: false,
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

  it("nie woła native API gdy kategoria jest stacjonarna", async () => {
    renderHook(() =>
      useWorkerGPS({ ...session, categoryIsStationary: true }, vi.fn(), vi.fn(), vi.fn(), true)
    );

    await waitFor(() => {
      expect(addWatcher).not.toHaveBeenCalled();
    });
    expect(clearQueue).not.toHaveBeenCalled();
  });

  it("uruchamia BackgroundGeolocation gdy śledzenie jest włączone", async () => {
    renderHook(() => useWorkerGPS(session, vi.fn(), vi.fn(), vi.fn(), true));

    await waitFor(() => {
      expect(addWatcher).toHaveBeenCalledTimes(1);
    });
  });
});
