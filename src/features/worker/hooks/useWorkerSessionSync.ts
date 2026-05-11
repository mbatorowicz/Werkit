"use client";

import { useEffect } from "react";
import { GPSManager } from "@/lib/gpsManager";
import { UI_BACKGROUND_SYNC_INTERVAL_MS } from "@/lib/uiBackgroundSync";
import type { InitialWorkerData } from "@/types/worker";

/**
 * Pierwsze załadowanie sesji/zleceń + ciche odświeżanie w tle oraz flush GPS przy powrocie na kartę.
 */
export function useWorkerSessionSync(
  initialData: InitialWorkerData | null,
  fetchSessionAndPath: (showLoader: boolean, fetchGpsPath: boolean) => Promise<void>,
) {
  useEffect(() => {
    queueMicrotask(() => {
      if (!initialData) void fetchSessionAndPath(true, true);
      else void fetchSessionAndPath(false, true);
    });

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (pollTimer !== null) return;
      pollTimer = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void fetchSessionAndPath(false, false);
      }, UI_BACKGROUND_SYNC_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchSessionAndPath(false, false);
        GPSManager.flushQueue();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (typeof document !== "undefined") {
      if (document.visibilityState === "visible") {
        startPolling();
      }
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        stopPolling();
      };
    }

    return () => {
      stopPolling();
    };
  }, [initialData, fetchSessionAndPath]);
}
