import { parseDecimalInput } from "@/lib/decimalInput";

function finiteCoord(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseDecimalInput(value) ?? Number.NaN;
  return Number.NaN;
}

/** Parsowanie pól `numeric` / JSON: string lub liczba (, i .). */
export function finiteLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = finiteCoord(lat);
  const b = finiteCoord(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { lat: a, lng: b };
}

export function isoTimestampFromUnknown(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString();
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  return undefined;
}

export function gpsTimestampFromRow(row: {
  recordedAt?: unknown;
  timestamp?: unknown;
}): string | undefined {
  return isoTimestampFromUnknown(row.recordedAt) ?? isoTimestampFromUnknown(row.timestamp);
}

export function headingDegreesFromUnknown(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const h = finiteCoord(v);
  if (!Number.isFinite(h)) return undefined;
  return h;
}
