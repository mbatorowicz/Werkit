"use client";

import { useMemo } from "react";
import { Polyline } from "react-leaflet";
import type { Coord } from "@/types/worker";
import { buildSpeedColoredSegments, pathHasTimestampsForSpeed } from "@/lib/gps";

/**
 * Ślad „przejechany" — wiele polilinii wg prędkości albo jedna niebieska.
 * Musi być wewnątrz `MapContainer` (react-leaflet).
 * Legenda prędkości została usunięta — niepotrzebnie zasłaniała mapę.
 */
export function TraveledPathLayers({ path }: { path: Coord[] }) {
  const showSpeedColors = pathHasTimestampsForSpeed(path);
  const speedSegments = useMemo(() => buildSpeedColoredSegments(path), [path]);

  if (path.length < 2) return null;

  return (
    <>
      {showSpeedColors ? (
        speedSegments.map((s, idx) => (
          <Polyline key={`traveled-spd-${idx}`} positions={s.positions} color={s.color} weight={5} opacity={0.85} />
        ))
      ) : (
        <Polyline positions={path.map((p) => [p.lat, p.lng])} color="#3b82f6" weight={5} opacity={0.7} />
      )}
    </>
  );
}
