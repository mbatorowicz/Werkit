import { sendRemoteLog } from "@/lib/remoteLogger";

/**
 * `fetch` z automatycznym logowaniem błędów HTTP do `device_logs` (kategoria `http`).
 * Używaj dla krytycznych zapytań workera, żeby w adminie widać było status + fragment odpowiedzi.
 */
export async function fetchWithDeviceTelemetry(
  label: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  try {
    const res = await fetch(input, init);
    if (!res.ok) {
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
        { category: "http" },
      );
    }
    return res;
  } catch (e) {
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
      { category: "http" },
    );
    throw e;
  }
}
