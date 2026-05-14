/**
 * Wspólne okna czasowe dla telemetrii w przeglądarce: deduplikacja przed `sendRemoteLog`
 * oraz throttle w `fetchWithDeviceTelemetry`. Zwraca `true`, gdy wpis należy pominąć
 * (ten sam klucz był już w oknie `windowMs` ms).
 */
const dedupeStore = new Map<string, number>();
const throttleStore = new Map<string, number>();

const DEDUPE_MAX_KEYS = 400;

function markOrSkip(
  store: Map<string, number>,
  key: string,
  windowMs: number,
  options?: { maxKeys?: number; staleMinMs?: number },
): boolean {
  const now = Date.now();
  const prev = store.get(key);
  if (prev !== undefined && now - prev < windowMs) {
    return true;
  }
  store.set(key, now);

  const maxKeys = options?.maxKeys;
  if (maxKeys !== undefined && store.size > maxKeys) {
    const staleMs = options?.staleMinMs ?? Math.max(windowMs * 4, 120_000);
    for (const [k, t] of store) {
      if (now - t > staleMs) {
        store.delete(k);
      }
    }
  }
  return false;
}

/** Dedupe przed POST do `/api/worker/logs` — identyczny zapis w krótkim oknie jest pomijany. */
export function shouldSkipClientLogDedupe(key: string, windowMs: number): boolean {
  return markOrSkip(dedupeStore, key, windowMs, {
    maxKeys: DEDUPE_MAX_KEYS,
    staleMinMs: Math.max(windowMs * 4, 120_000),
  });
}

/** Throttle dla WARN/ERROR z `fetch` (np. GPS, OSRM) — osobna mapa niż dedupe logów. */
export function shouldThrottleTelemetryLog(key: string, windowMs: number): boolean {
  return markOrSkip(throttleStore, key, windowMs);
}
