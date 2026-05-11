"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";

/**
 * Android (Capacitor): hardware „wstecz” — jeden listener w root `layout.tsx`.
 * Gdy w WebView jest więcej niż jeden wpis historii → `router.back()`; na pierwszym ekranie
 * (brak sensownego „wstecz”) → `App.minimizeApp()`.
 */
export function CapacitorBackButton() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: { remove: () => void } | null = null;

    void App.addListener("backButton", () => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        void App.minimizeApp();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [router]);

  return null;
}
