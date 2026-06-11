import { formatDict } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/types";
import type { WerkitLogCategory } from "@/types/deviceTelemetry";

export const LOG_CATEGORIES: WerkitLogCategory[] = [
  "http",
  "gps",
  "session",
  "orders",
  "notifications",
  "lifecycle",
  "ui",
  "errors",
  "unknown",
  "admin",
  "auth",
  "profile",
];

export type LogItem = {
  id: number;
  userId: number | null;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  workerName: string | null;
};

export type LogsDict = AppDictionary["admin"]["logs"];

type TelemetryLineDict = LogsDict["telemetryLine"];

export function getLogCategory(
  metadata: Record<string, unknown> | null | undefined
): WerkitLogCategory | undefined {
  if (!metadata) return undefined;
  const top = metadata.category;
  if (typeof top === "string") return top as WerkitLogCategory;
  const wc = metadata.werkitContext;
  if (wc && typeof wc === "object" && !Array.isArray(wc)) {
    const c = (wc as Record<string, unknown>).category;
    if (typeof c === "string") return c as WerkitLogCategory;
  }
  return undefined;
}

function pushClientTelemetryParts(
  c: Record<string, unknown>,
  tl: TelemetryLineDict,
  parts: string[]
) {
  if (typeof c.appVersion === "string")
    parts.push(formatDict(tl.appVersion, { version: c.appVersion }));
  if (typeof c.platform === "string") parts.push(c.platform);
  if (typeof c.path === "string") parts.push(c.path);
  if (typeof c.correlationId === "string") {
    const id = c.correlationId;
    const idDisplay = id.length > 12 ? `${id.slice(0, 12)}…` : id;
    parts.push(formatDict(tl.trace, { id: idDisplay }));
  }
  if (c.online === false) parts.push(tl.offline);
  if (typeof c.connEffectiveType === "string") {
    parts.push(formatDict(tl.net, { type: c.connEffectiveType }));
  }
}

function pushWerkitContextParts(wc: unknown, tl: TelemetryLineDict, parts: string[]) {
  if (!wc || typeof wc !== "object" || Array.isArray(wc)) return;
  const wco = wc as Record<string, unknown>;
  const client = wco.client;
  if (client && typeof client === "object" && !Array.isArray(client)) {
    pushClientTelemetryParts(client as Record<string, unknown>, tl, parts);
  }
  const server = wco.server;
  if (server && typeof server === "object" && !Array.isArray(server)) {
    const s = server as Record<string, unknown>;
    if (typeof s.region === "string" && s.region) {
      parts.push(formatDict(tl.edge, { region: s.region }));
    }
  }
}

export function summarizeTelemetryLine(
  metadata: Record<string, unknown> | null | undefined,
  logsDict: LogsDict
): string | null {
  if (!metadata) return null;
  const parts: string[] = [];
  const tl = logsDict.telemetryLine;
  const cat = getLogCategory(metadata);
  if (cat) parts.push(logsDict.logCategoryLabels[cat]);

  pushWerkitContextParts(metadata.werkitContext, tl, parts);

  if (typeof metadata.status === "number") {
    parts.push(formatDict(tl.httpStatus, { status: metadata.status }));
  }
  if (typeof metadata.url === "string" && metadata.url.length > 0) {
    const u = metadata.url.length > 96 ? `${metadata.url.slice(0, 96)}…` : metadata.url;
    parts.push(u);
  }

  return parts.length ? parts.join(" · ") : null;
}

export function hasMetadataPayload(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata) return false;
  return Object.keys(metadata).length > 0;
}

export function getLevelColor(level: string): string {
  switch (level) {
    case "ERROR":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    case "WARN":
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "DEBUG":
      return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    default:
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  }
}
