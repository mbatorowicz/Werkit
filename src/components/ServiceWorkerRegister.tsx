"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { offlineActionQueue } from "@/lib/offlineActionQueue";
import { sendRemoteLog } from "@/lib/remoteLogger";

/**
 * Rejestruje Service Worker dla PWA (nie w Capacitor WebView — tam ładujemy HTTPS).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!("serviceWorker" in navigator)) return;

    const timer = setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          const swReg = reg as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          };
          if (swReg.sync && typeof swReg.sync.register === "function") {
            swReg.sync.register("werkit-flush-queue").catch(() => {});
          }
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });
    }, 2000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "FLUSH_OFFLINE_QUEUE") {
        sendRemoteLog("INFO", "SW: received FLUSH_OFFLINE_QUEUE, flushing queue", undefined, {
          category: "session",
        });
        offlineActionQueue.flushAll().catch(() => {});
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
