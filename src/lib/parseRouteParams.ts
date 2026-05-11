/** Parsowanie dodatnich identyfikatorów z segmentów URL lub pól JSON (API). */

export function parsePositiveIntFromString(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export function parsePositiveIntParam(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}
