"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** Kafelki po zmianie rozmiaru kontenera (flex, mobile) — bez tego bywa pusta mapa. */
export function MapInvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (typeof ResizeObserver === "undefined") {
      queueMicrotask(() => {
        map.invalidateSize({ animate: false });
      });
      return;
    }
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);
    queueMicrotask(() => {
      map.invalidateSize({ animate: false });
    });
    return () => {
      ro.disconnect();
    };
  }, [map]);
  return null;
}
