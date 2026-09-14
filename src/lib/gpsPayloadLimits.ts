/** Limity payloadu GPS (S2) — SSOT serwera i chunkowania kolejki workera. */

export const GPS_MAX_POINTS_PER_REQUEST = 200;

/** Odrzucamy punkty starsze niż 24 h (anty-spam); ślad offline w typowej zmianie mieści się w oknie. */
export const GPS_TIMESTAMP_PAST_MS = 24 * 60 * 60 * 1000;

/** Tolerancja zegara urządzenia / sieci. */
export const GPS_TIMESTAMP_FUTURE_MS = 5 * 60 * 1000;

export type GpsPayloadPoint = {
  lat?: unknown;
  lng?: unknown;
  timestamp?: unknown;
};

export type NormalizedGpsPoint = {
  lat: number;
  lng: number;
  timestamp: Date;
};

export function isFiniteGpsCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function isGpsTimestampInWindow(ts: Date, nowMs: number): boolean {
  const t = ts.getTime();
  if (!Number.isFinite(t)) return false;
  return t >= nowMs - GPS_TIMESTAMP_PAST_MS && t <= nowMs + GPS_TIMESTAMP_FUTURE_MS;
}

function parseOptionalTimestamp(raw: unknown, now: Date): Date | null {
  if (raw == null || raw === "") return now;
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const parsed = new Date(raw);
  if (!isGpsTimestampInWindow(parsed, now.getTime())) return null;
  return parsed;
}

/** Filtr bbox + skończone liczby + okno czasu. Nie rzuca — nadmiar tablicy obsługuje `assertGpsPayloadSize`. */
export function normalizeGpsPoints(
  points: GpsPayloadPoint[],
  now: Date = new Date()
): NormalizedGpsPoint[] {
  const out: NormalizedGpsPoint[] = [];
  for (const p of points) {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    if (!isFiniteGpsCoord(p.lat, p.lng)) continue;
    const timestamp = parseOptionalTimestamp(p.timestamp, now);
    if (!timestamp) continue;
    out.push({ lat: p.lat, lng: p.lng, timestamp });
  }
  return out;
}

export function assertGpsPayloadSize(points: { length: number }): void {
  if (points.length > GPS_MAX_POINTS_PER_REQUEST) {
    throw new Error("payload_too_large");
  }
}
