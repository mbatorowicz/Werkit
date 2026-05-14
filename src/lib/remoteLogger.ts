import { shouldSkipClientLogDedupe } from "@/lib/clientRateLimit";
import { buildWerkitClientTelemetry } from "@/lib/deviceTelemetryContext";
import type { WerkitLogCategory } from "@/types/deviceTelemetry";

export type RemoteLogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export type RemoteLogOptions = {
  /** Ułatwia filtrowanie w `/admin/logs` i w eksporcie JSON */
  category?: WerkitLogCategory;
  /** Pomija kolejne identyczne (wg klucza) wpisy w zadanym oknie — mniej duplikatów w `device_logs`. */
  dedupeWindowMs?: number;
  /** Rozszerza klucz deduplikacji (np. plik:linia); domyślnie klucz = category + level + początek message. */
  dedupeKeyExtra?: string;
};

function mergeWerkitMetadata(
  metadata: Record<string, unknown> | undefined,
  opts: RemoteLogOptions | undefined,
): Record<string, unknown> {
  const base = { ...(metadata ?? {}) };
  const client = buildWerkitClientTelemetry();
  const category =
    opts?.category ??
    (typeof base.category === "string" ? (base.category as WerkitLogCategory) : undefined);

  const rawCtx = base.werkitContext;
  const restFromCaller =
    typeof rawCtx === "object" && rawCtx !== null && !Array.isArray(rawCtx)
      ? (() => {
          const copy = { ...(rawCtx as Record<string, unknown>) };
          delete copy.server;
          delete copy.client;
          return copy;
        })()
      : {};

  const werkitContext: Record<string, unknown> = {
    ...restFromCaller,
    client,
    ...(category ? { category } : {}),
  };

  return {
    ...base,
    werkitContext,
    ...(category ? { category } : {}),
  };
}

/**
 * Log z urządzenia pracownika → `device_logs` (panel `/admin/logs`).
 * Automatycznie dokleja `werkitContext.client` (wersja, URL, UA, korelacja, sieć).
 */
export function sendRemoteLog(
  level: RemoteLogLevel,
  message: string,
  metadata?: Record<string, unknown>,
  opts?: RemoteLogOptions,
): void {
  if (typeof window === "undefined") return;
  const dedupeMs = opts?.dedupeWindowMs;
  if (dedupeMs !== undefined && dedupeMs > 0) {
    const cat = opts?.category ?? "http";
    const extra = opts?.dedupeKeyExtra ?? "";
    const key = `${cat}|${level}|${message.slice(0, 240)}|${extra}`.slice(0, 500);
    if (shouldSkipClientLogDedupe(key, dedupeMs)) return;
  }
  const merged = mergeWerkitMetadata(metadata, opts);
  void fetch("/api/worker/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, message, metadata: merged }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Krótki log domenowy — `message` z prefiksem `[category]` dla czytelności w konsoli admina.
 */
export function logWorkerInsight(
  category: WerkitLogCategory,
  message: string,
  details?: Record<string, unknown>,
): void {
  sendRemoteLog("INFO", `[${category}] ${message}`, details, { category });
}
