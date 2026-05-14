import type { Coord } from "@/types/worker";
import { GPSManager } from "@/lib/gpsManager";

export type SpeedPathSegment = {
  positions: [number, number][];
  color: string;
};

function parseTimeMs(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function colorForSpeedKmh(kmh: number): string {
  if (kmh < 1) return "#64748b";
  if (kmh < 22) return "#047857";
  if (kmh < 50) return "#10b981";
  if (kmh < 85) return "#eab308";
  return "#ea580c";
}

const FALLBACK_TRACE = "#3b82f6";

/**
 * Odcinki do wielu `Polyline` (Leaflet nie ma gradientu po jednej linii).
 * Łączy sąsiednie odcinki o tym samym kolorze, żeby nie mnożyć warstw.
 */
export function buildSpeedColoredSegments(path: Coord[]): SpeedPathSegment[] {
  if (path.length < 2) return [];

  const merged: SpeedPathSegment[] = [];

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const ta = parseTimeMs(a.recordedAt);
    const tb = parseTimeMs(b.recordedAt);

    let color = FALLBACK_TRACE;
    if (ta !== null && tb !== null) {
      const dt = (tb - ta) / 1000;
      if (dt > 0.05) {
        const m = GPSManager.getDistance(a, b);
        const kmhRaw = (m / dt) * 3.6;
        const kmh = Math.min(Math.max(kmhRaw, 0), 160);
        color = colorForSpeedKmh(kmh);
      } else {
        color = "#64748b";
      }
    }

    const prev = merged[merged.length - 1];
    if (prev && prev.color === color) {
      prev.positions.push([b.lat, b.lng]);
    } else {
      merged.push({
        positions: [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        color,
      });
    }
  }

  return merged;
}

export function pathHasTimestampsForSpeed(path: Coord[]): boolean {
  return path.some((p) => typeof p.recordedAt === "string" && p.recordedAt.length > 0);
}
