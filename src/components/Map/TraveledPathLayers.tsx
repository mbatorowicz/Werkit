"use client";

import { useMemo } from "react";
import { Polyline } from "react-leaflet";
import type { Coord } from "@/types/worker";
import { buildSpeedColoredSegments, pathHasTimestampsForSpeed } from "@/lib/gps";

export type SpeedLegendLabels = {
  speedLegendTitle: string;
  speedLegendSlow: string;
  speedLegendFast: string;
};

/**
 * Ślad „przejechany” — wiele polilinii wg prędkości albo jedna niebieska, plus legenda.
 * Musi być wewnątrz `MapContainer` (react-leaflet).
 */
export function TraveledPathLayers({ path, legend }: { path: Coord[]; legend: SpeedLegendLabels }) {
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

      {showSpeedColors ? (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-[999] flex -translate-x-1/2 flex-col items-center gap-1 rounded-lg border border-zinc-200/80 bg-white/95 px-2.5 py-1.5 text-[10px] text-zinc-600 shadow-md dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-300">
          <span className="font-semibold uppercase tracking-wide">{legend.speedLegendTitle}</span>
          <div className="flex w-40 items-center gap-1">
            <span className="shrink-0 text-zinc-400">{legend.speedLegendSlow}</span>
            <div
              className="h-2 flex-1 rounded-full"
              style={{
                background: "linear-gradient(90deg,#64748b,#047857,#10b981,#eab308,#ea580c)",
              }}
            />
            <span className="shrink-0 text-zinc-400">{legend.speedLegendFast}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
