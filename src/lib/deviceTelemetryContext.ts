import type { WerkitClientTelemetry } from "@/types/deviceTelemetry";

const CORR_KEY = "werkit_log_correlation_id";

function correlationId(): string {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return "ssr";
  }
  let id = sessionStorage.getItem(CORR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(CORR_KEY, id);
  }
  return id;
}

function capacitorPlatform(): string {
  if (typeof window === "undefined") return "unknown";
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "ios" || p === "android" || p === "web") return p;
  return "web";
}

function networkHints(): Pick<WerkitClientTelemetry, "saveData" | "connDownlinkMbps" | "connEffectiveType"> {
  if (typeof navigator === "undefined") return {};
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; downlink?: number; effectiveType?: string };
  };
  const c = nav.connection;
  if (!c) return {};
  return {
    saveData: typeof c.saveData === "boolean" ? c.saveData : undefined,
    connDownlinkMbps: typeof c.downlink === "number" ? c.downlink : undefined,
    connEffectiveType: typeof c.effectiveType === "string" ? c.effectiveType : undefined,
  };
}

/**
 * Kontekst wysyłany z każdym logiem z przeglądarki — wersja aplikacji, ekran, UA, korelacja sesji przeglądarki.
 * `APP_VERSION` pochodzi z `next.config.ts` → `process.env.APP_VERSION` (wstrzyknięte przy buildzie).
 */
export function buildWerkitClientTelemetry(): WerkitClientTelemetry {
  const appVersion =
    typeof process !== "undefined" && typeof process.env.APP_VERSION === "string"
      ? process.env.APP_VERSION
      : "unknown";

  if (typeof window === "undefined") {
    return {
      appVersion,
      clientIso: new Date().toISOString(),
      correlationId: "ssr",
      path: "",
      href: "",
      ua: "",
      platform: "unknown",
      lang: "",
      online: undefined,
      vw: undefined,
      vh: undefined,
      dpr: undefined,
    };
  }

  return {
    appVersion,
    clientIso: new Date().toISOString(),
    correlationId: correlationId(),
    path: window.location.pathname,
    href: window.location.href.slice(0, 900),
    ua: navigator.userAgent.slice(0, 500),
    platform: capacitorPlatform(),
    lang: navigator.language,
    online: navigator.onLine,
    vw: window.innerWidth,
    vh: window.innerHeight,
    dpr: typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : undefined,
    ...networkHints(),
  };
}
