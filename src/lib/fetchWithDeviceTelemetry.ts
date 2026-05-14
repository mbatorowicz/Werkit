import { sendRemoteLog } from "@/lib/remoteLogger";
import type { WerkitLogCategory } from "@/types/deviceTelemetry";

export type FetchDeviceTelemetryOptions = {
  category?: WerkitLogCategory;
  /** Ogranicza częstotliwość WARN/ERROR (np. flush GPS w pętli, OSRM przy jitterze współrzędnych). */
  throttleKey?: string;
  throttleMs?: number;
};

const throttleLast = new Map<string, number>();

/** Zwraca `true`, gdy log ma zostać pominięty (w oknie throttlingu). */
function shouldSuppressTelemetryLog(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = throttleLast.get(key);
  if (last !== undefined && now - last < windowMs) {
    return true;
  }
  throttleLast.set(key, now);
  return false;
}

/**
 * `fetch` z automatycznym logowaniem błędów do `device_logs` (telemetria klienta + kategoria).
 * Domyślna kategoria: `http` (np. usługi zewnętrzne); dla API admina ustaw `admin`, dla logowania `auth`.
 */
export async function fetchWithDeviceTelemetry(
  label: string,
  input: RequestInfo | URL,
  init?: RequestInit,
  logOpts?: FetchDeviceTelemetryOptions,
): Promise<Response> {
  const category: WerkitLogCategory = logOpts?.category ?? "http";
  const throttleKey = logOpts?.throttleKey;
  const throttleMs = logOpts?.throttleMs ?? 0;

  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  const allowHttpLog = () =>
    !(throttleKey && throttleMs > 0 && shouldSuppressTelemetryLog(`${throttleKey}:http`, throttleMs));
  const allowThrowLog = () =>
    !(throttleKey && throttleMs > 0 && shouldSuppressTelemetryLog(`${throttleKey}:throw`, throttleMs));

  try {
    const res = await fetch(input, init);
    if (!res.ok && allowHttpLog()) {
      const preview = await res
        .clone()
        .text()
        .then((t) => t.slice(0, 1200))
        .catch(() => "");
      sendRemoteLog(
        "WARN",
        `${label}: HTTP ${res.status} ${res.statusText || ""}`.trim(),
        {
          url: urlStr.slice(0, 900),
          status: res.status,
          statusText: res.statusText,
          responsePreview: preview,
        },
        { category },
      );
    }
    return res;
  } catch (e) {
    if (allowThrowLog()) {
      sendRemoteLog(
        "ERROR",
        `${label}: wyjątek fetch`,
        {
          url: urlStr.slice(0, 900),
          error:
            e instanceof Error
              ? { name: e.name, message: e.message, stack: e.stack?.slice(0, 4000) }
              : { raw: String(e) },
        },
        { category },
      );
    }
    throw e;
  }
}
