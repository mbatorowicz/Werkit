/**
 * Konwencja metadanych logów z aplikacji (worker / PWA / Capacitor).
 * Pole `werkitContext` ustawia `remoteLogger` — ułatwia debug i priorytetyzację poprawek.
 */
export type WerkitLogCategory =
  | "http"
  | "gps"
  | "session"
  | "orders"
  | "notifications"
  | "lifecycle"
  | "ui"
  | "errors"
  | "unknown"
  | "admin"
  | "auth"
  | "profile";

/** Część klienta — zawsze doklejana do `metadata.werkitContext.client` */
export type WerkitClientTelemetry = {
  appVersion: string;
  clientIso: string;
  correlationId: string;
  path: string;
  href: string;
  ua: string;
  platform: string;
  lang: string;
  online: boolean | undefined;
  vw: number | undefined;
  vh: number | undefined;
  dpr: number | undefined;
  saveData?: boolean;
  connDownlinkMbps?: number;
  connEffectiveType?: string;
};

/** Serwer dopisuje przy `POST /api/worker/logs` */
export type WerkitServerTelemetry = {
  receivedAt: string;
  nodeEnv: string;
  region: string | null;
};

export type WerkitLogContextEnvelope = {
  client: WerkitClientTelemetry;
  server?: WerkitServerTelemetry;
  /** Kategoria zdarzenia (np. `http`) — duplikat w metadata.category dla filtrów w UI */
  category?: WerkitLogCategory;
};
