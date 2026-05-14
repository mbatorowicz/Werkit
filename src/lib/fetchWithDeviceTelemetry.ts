import { sendRemoteLog, type RemoteLogOptions } from "@/lib/remoteLogger";
import { shouldThrottleTelemetryLog } from "@/lib/clientRateLimit";
import type { WerkitLogCategory } from "@/types/deviceTelemetry";

export type FetchDeviceTelemetryOptions = {
  category?: WerkitLogCategory;
  /** Ogranicza częstotliwość WARN/ERROR (np. flush GPS w pętli, OSRM przy jitterze współrzędnych). */
  throttleKey?: string;
  throttleMs?: number;
};

/** Sieć / abort — nie traktujemy jak krytyczny błąd aplikacji (mniej szumu w `device_logs`). */
function isLikelyTransientFetchFailure(e: unknown): boolean {
  if (e === null || e === undefined) return false;
  if (typeof e !== "object") return false;
  const name = "name" in e && typeof (e as { name?: unknown }).name === "string" ? (e as { name: string }).name : "";
  if (name === "AbortError") return true;
  const msg =
    "message" in e && typeof (e as { message?: unknown }).message === "string"
      ? String((e as { message: string }).message)
      : "";
  const lower = msg.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed"))
    return true;
  if (lower.includes("network request failed") || lower.includes("fetch failed")) return true;
  if (lower.includes("ecconnreset") || lower.includes("etimedout") || lower.includes("econnrefused")) return true;
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
    !(throttleKey && throttleMs > 0 && shouldThrottleTelemetryLog(`${throttleKey}:http`, throttleMs));
  const allowThrowLog = () =>
    !(throttleKey && throttleMs > 0 && shouldThrottleTelemetryLog(`${throttleKey}:throw`, throttleMs));

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
        {
          category,
          dedupeWindowMs: 12_000,
          dedupeKeyExtra: `http|${res.status}|${urlStr.slice(0, 240)}`,
        },
      );
    }
    return res;
  } catch (e) {
    if (allowThrowLog()) {
      const transient = isLikelyTransientFetchFailure(e);
      const remoteOpts: RemoteLogOptions = { category };
      if (transient && category === "admin") {
        remoteOpts.dedupeWindowMs = 5000;
        remoteOpts.dedupeKeyExtra = "admin|transient_fetch_burst";
      } else if (transient) {
        remoteOpts.dedupeWindowMs = 8000;
        remoteOpts.dedupeKeyExtra = `transient|${label}`;
      }
      sendRemoteLog(
        transient ? "WARN" : "ERROR",
        `${label}: wyjątek fetch`,
        {
          url: urlStr.slice(0, 900),
          transientNetwork: transient,
          error:
            e instanceof Error
              ? { name: e.name, message: e.message, stack: e.stack?.slice(0, 4000) }
              : { raw: String(e) },
        },
        remoteOpts,
      );
    }
    throw e;
  }
}
