"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { usePathname } from "next/navigation";

/**
 * Android (Capacitor): hardware „wstecz” — jeden listener w root `layout.tsx`.
 *
 * Zamiast zawodnego `window.history.length` (Next.js SPA nie aktualizuje go
 * wiarygodnie przy soft-nawigacji / odświeżeniu) śledzimy własny stos ścieżek
 * przez `popstate` + `pushstate`.
 *
 * Gdy stos ma > 1 wpis → `history.back()`; na pierwszym ekranie → `App.minimizeApp()`.
 */
export function CapacitorBackButton() {
  const pathname = usePathname();
  const stackRef = useRef<string[]>([pathname]);

  // Synchronizuj stos przy każdej zmianie ścieżki
  useEffect(() => {
    const stack = stackRef.current;
    const prev = stack[stack.length - 1];
    if (prev !== pathname) {
      stack.push(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: { remove: () => void } | null = null;

    const onPopState = () => {
      // Gdy użytkownik kliknie przeglądarkowy wstecz — usuń ostatni wpis ze stosu
      const stack = stackRef.current;
      if (stack.length > 1) {
        stack.pop();
      }
    };

    window.addEventListener("popstate", onPopState);

    void App.addListener("backButton", () => {
      const stack = stackRef.current;
      if (stack.length > 1) {
        // Usuń bieżącą ścieżkę i cofnij
        stack.pop();
        window.history.back();
      } else {
        void App.minimizeApp();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
