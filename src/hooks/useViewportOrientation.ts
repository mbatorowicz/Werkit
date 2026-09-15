"use client";

import { useSyncExternalStore } from "react";

/** Próg Tailwindowego `lg` — poniżej Gantt idzie w tryb mobilny. */
export const LG_BREAKPOINT_PX = 1024;

export type ViewportOrientation = {
  isNarrow: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
};

const DESKTOP_SNAPSHOT: ViewportOrientation = {
  isNarrow: false,
  isLandscape: false,
  isPortrait: true,
};

function matchesMedia(win: Pick<Window, "matchMedia">, query: string): boolean {
  return typeof win.matchMedia === "function" && win.matchMedia(query).matches;
}

export function readViewportOrientation(
  win: Pick<Window, "innerWidth" | "innerHeight" | "matchMedia"> = window
): ViewportOrientation {
  const isNarrow = win.innerWidth < LG_BREAKPOINT_PX;
  const landscapeMq = matchesMedia(win, "(orientation: landscape)");
  const isLandscape = landscapeMq || win.innerWidth > win.innerHeight;
  return { isNarrow, isLandscape, isPortrait: !isLandscape };
}

function sameSnapshot(a: ViewportOrientation, b: ViewportOrientation): boolean {
  return (
    a.isNarrow === b.isNarrow && a.isLandscape === b.isLandscape && a.isPortrait === b.isPortrait
  );
}

/**
 * `useSyncExternalStore` porównuje snapshot przez `Object.is`.
 * Nowy obiekt przy każdym odczycie = nieskończona pętla renderów (crash karty).
 */
let cachedSnapshot: ViewportOrientation = DESKTOP_SNAPSHOT;

function getSnapshot(): ViewportOrientation {
  const next = readViewportOrientation();
  if (sameSnapshot(cachedSnapshot, next)) return cachedSnapshot;
  cachedSnapshot = next;
  return cachedSnapshot;
}

function getServerSnapshot(): ViewportOrientation {
  return DESKTOP_SNAPSHOT;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", onStoreChange);
  if (typeof window.matchMedia !== "function") {
    return () => window.removeEventListener("resize", onStoreChange);
  }
  const mqWidth = window.matchMedia(`(max-width: ${LG_BREAKPOINT_PX - 1}px)`);
  const mqOrient = window.matchMedia("(orientation: landscape)");
  mqWidth.addEventListener("change", onStoreChange);
  mqOrient.addEventListener("change", onStoreChange);
  return () => {
    mqWidth.removeEventListener("change", onStoreChange);
    mqOrient.removeEventListener("change", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

/** Orientacja i szerokość viewportu — SSR zwraca desktop, żeby nie hydrować overlayu. */
export function useViewportOrientation(): ViewportOrientation {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
