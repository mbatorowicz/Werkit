/** Wiersz z API / Drizzle: `numeric` bywa stringiem albo liczbą po JSON. */
export function finiteLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = typeof lat === "number" ? lat : typeof lat === "string" ? parseFloat(lat) : Number.NaN;
  const b = typeof lng === "number" ? lng : typeof lng === "string" ? parseFloat(lng) : Number.NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { lat: a, lng: b };
}

export function isoTimestampFromUnknown(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString();
  return undefined;
}
