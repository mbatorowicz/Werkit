/**
 * CSRF przy SameSite=None (Capacitor WebView).
 * Prosty `<form method="POST">` z obcej strony zawsze ustawia `Origin` — odrzucamy, gdy nie pasuje.
 * Brak Origin: tylko JSON albo nagłówek `X-Werkit-Request` (curl / testy, nie formularz HTML).
 * Edge-safe — bez DB.
 */

export const CSRF_HEADER = "x-werkit-request";
export const CSRF_HEADER_VALUE = "1";
export const CSRF_REJECTED = "csrf_rejected";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Origin WebView Capacitor, gdy bundle nie ładuje remote URL (nie da się sfałszować z http(s) strony). */
const CAPACITOR_WEBVIEW_ORIGINS = new Set(["capacitor://localhost", "ionic://localhost"]);

export function isMutatingHttpMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

function requestSiteOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  try {
    const url = new URL(request.url);
    origins.add(url.origin);
    const host = request.headers.get("host")?.split(",")[0]?.trim();
    if (host) {
      const proto = url.protocol.replace(":", "");
      origins.add(`${proto}://${host}`);
      const xfProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
      if (xfProto) origins.add(`${xfProto}://${host}`);
    }
  } catch {
    /* ignore */
  }
  return origins;
}

export function isTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    const ct = (request.headers.get("content-type") ?? "").toLowerCase();
    if (ct.includes("application/json")) return true;
    if (request.headers.get(CSRF_HEADER) === CSRF_HEADER_VALUE) return true;
    return false;
  }
  if (CAPACITOR_WEBVIEW_ORIGINS.has(origin)) return true;
  return requestSiteOrigins(request).has(origin);
}
