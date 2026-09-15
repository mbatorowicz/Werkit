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

export function readViewportOrientation(
  win: Pick<Window, "innerWidth" | "innerHeight" | "matchMedia"> = window
): ViewportOrientation {
  const isNarrow = win.innerWidth < LG_BREAKPOINT_PX;
  const landscapeMq = win.matchMedia("(orientation: landscape)").matches;
  const isLandscape = landscapeMq || win.innerWidth > win.innerHeight;
  return { isNarrow, isLandscape, isPortrait: !isLandscape };
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mqWidth = window.matchMedia(`(max-width: ${LG_BREAKPOINT_PX - 1}px)`);
  const mqOrient = window.matchMedia("(orientation: landscape)");
  mqWidth.addEventListener("change", onStoreChange);
  mqOrient.addEventListener("change", onStoreChange);
  window.addEventListener("resize", onStoreChange);
  return () => {
    mqWidth.removeEventListener("change", onStoreChange);
    mqOrient.removeEventListener("change", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

function getSnapshot(): ViewportOrientation {
  return readViewportOrientation();
}

/** Orientacja i szerokość viewportu — SSR zwraca desktop, żeby nie hydrować overlayu. */
export function useViewportOrientation(): ViewportOrientation {
  return useSyncExternalStore(subscribe, getSnapshot, () => DESKTOP_SNAPSHOT);
}
