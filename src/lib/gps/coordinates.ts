/** Parsowanie pól `numeric` / JSON: string lub liczba. */
export function finiteLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = typeof lat === "number" ? lat : typeof lat === "string" ? parseFloat(lat) : Number.NaN;
  const b = typeof lng === "number" ? lng : typeof lng === "string" ? parseFloat(lng) : Number.NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { lat: a, lng: b };
}

export function isoTimestampFromUnknown(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString();
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  return undefined;
}

export function gpsTimestampFromRow(row: { recordedAt?: unknown; timestamp?: unknown }): string | undefined {
  return isoTimestampFromUnknown(row.recordedAt) ?? isoTimestampFromUnknown(row.timestamp);
}

export function headingDegreesFromUnknown(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const h = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : Number.NaN;
  if (!Number.isFinite(h)) return undefined;
  return h;
}
