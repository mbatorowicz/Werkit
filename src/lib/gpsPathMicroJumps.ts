import type { Coord } from "@/types/worker";
import { GPSManager } from "@/lib/gpsManager";

/**
 * Próbki bliżej niż ten dystans od ostatniego punktu na śladzie = typowy szum przy postoju (telefon stoi w ~kilku metrach).
 * Nie dopinamy wtedy nowego segmentu — tylko aktualizujemy ostatni punkt (mapa bez „pajęczyny”).
 */
export const GPS_PATH_STATIONARY_MERGE_MAX_METERS = 14;

/**
 * Inkrementalne dodanie próbki: jeśli jest blisko poprzedniego punktu trasy (typowy szum przy postoju),
 * zastępujemy ogon zamiast dopinać nowy segment — brak „pajęczyny” na mapie i brak narastania km.
 */
export function foldAppendGpsSample(
  prev: Coord[],
  newLoc: Coord,
  radiusM: number = GPS_PATH_STATIONARY_MERGE_MAX_METERS,
): { path: Coord[]; addedKm: number } {
  if (prev.length === 0) {
    return { path: [{ ...newLoc }], addedKm: 0 };
  }
  const last = prev[prev.length - 1];
  const d = GPSManager.getDistance(last, newLoc);
  if (d < radiusM) {
    if (prev.length >= 2) {
      return { path: [...prev.slice(0, -1), { ...newLoc }], addedKm: 0 };
    }
    return { path: prev, addedKm: 0 };
  }
  return { path: [...prev, { ...newLoc }], addedKm: d / 1000 };
}

/** Jednorazowe złożenie surowej listy z API / historii (ta sama logika co przy żywym GPS). */
export function foldMicroJumpsInPath(
  points: Coord[],
  radiusM: number = GPS_PATH_STATIONARY_MERGE_MAX_METERS,
): Coord[] {
  let acc: Coord[] = [];
  for (const p of points) {
    acc = foldAppendGpsSample(acc, p, radiusM).path;
  }
  return acc;
}

export function sumPathLengthKm(points: Coord[]): number {
  if (points.length < 2) return 0;
  let m = 0;
  for (let i = 1; i < points.length; i++) {
    m += GPSManager.getDistance(points[i - 1], points[i]);
  }
  return m / 1000;
}
