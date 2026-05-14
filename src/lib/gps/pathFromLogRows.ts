import type { Coord } from "@/types/worker";
import { finiteLatLng, gpsTimestampFromRow, headingDegreesFromUnknown } from "./coordinates";
import { foldMicroJumpsInPath } from "./stationaryPath";

/**
 * Wiersz z `gps_logs`, odpowiedzi API worker (`lat`/`lng`) lub admin (po `JSON.stringify` z Drizzle).
 */
export type RawGpsCoordinateRow = {
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  lng?: unknown;
  timestamp?: unknown;
  recordedAt?: unknown;
  heading?: unknown;
};

export function coordFromRawGpsRow(row: RawGpsCoordinateRow): Coord | null {
  const base = finiteLatLng(row.latitude ?? row.lat, row.longitude ?? row.lng);
  if (!base) return null;
  const recordedAt = gpsTimestampFromRow(row);
  const heading = headingDegreesFromUnknown(row.heading);
  return {
    ...base,
    ...(recordedAt ? { recordedAt } : {}),
    ...(heading !== undefined ? { heading } : {}),
  };
}

export function coordsFromRawGpsLogRows(
  rows: readonly RawGpsCoordinateRow[],
  options?: { reverseToChronological?: boolean },
): Coord[] {
  const mapped = rows.map(coordFromRawGpsRow).filter((p): p is Coord => p !== null);
  return options?.reverseToChronological ? [...mapped].reverse() : mapped;
}

/** Ślad do mapy: parsowanie + ewentualne odwrócenie kolejności + scalenie szumu postoju. */
export function displayPathFromRawGpsRows(
  rows: readonly RawGpsCoordinateRow[],
  options?: { reverseToChronological?: boolean },
): Coord[] {
  return foldMicroJumpsInPath(coordsFromRawGpsLogRows(rows, options));
}
