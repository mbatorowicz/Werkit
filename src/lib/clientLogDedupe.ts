/** Ostatni czas wysłania logu o danym kluczu (deduplikacja po stronie klienta przed POST do `device_logs`). */
const lastSentAt = new Map<string, number>();

const MAX_KEYS = 400;

/**
 * @returns `true` gdy ten wpis należy **pominąć** (identyczny klucz już był w oknie `windowMs`).
 */
export function shouldSkipClientLogDedupe(key: string, windowMs: number): boolean {
  const now = Date.now();
  const prev = lastSentAt.get(key);
  if (prev !== undefined && now - prev < windowMs) {
    return true;
  }
  lastSentAt.set(key, now);
  if (lastSentAt.size > MAX_KEYS) {
    for (const [k, t] of lastSentAt) {
      if (now - t > Math.max(windowMs * 4, 120_000)) {
        lastSentAt.delete(k);
      }
    }
  }
  return false;
}
