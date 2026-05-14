import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/auth";
import type { WerkitServerTelemetry } from "@/types/deviceTelemetry";

function attachServerTelemetry(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (metadata === null || metadata === undefined) {
    return metadata;
  }
  const wcRaw = metadata.werkitContext;
  const baseCtx =
    typeof wcRaw === "object" && wcRaw !== null && !Array.isArray(wcRaw)
      ? { ...(wcRaw as Record<string, unknown>) }
      : {};
  const server: WerkitServerTelemetry = {
    receivedAt: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    region: process.env.VERCEL_REGION ?? null,
  };
  return {
    ...metadata,
    werkitContext: {
      ...baseCtx,
      server,
    },
  };
}

export const POST = withApiErrorHandling(async (req: Request) => {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const verified = await jwtVerify(token, JWT_SECRET);
  const userId = verified.payload.userId as number;

  const body = await parseJsonBody(req);
  const rawLevel = typeof body.level === "string" ? body.level.trim().toUpperCase() : "INFO";
  const allowed = new Set(["INFO", "WARN", "ERROR", "DEBUG"]);
  const level = allowed.has(rawLevel) ? rawLevel : "INFO";
  const rawMsg = typeof body.message === "string" ? body.message : "Brak wiadomości";
  const message = rawMsg.length > 4000 ? rawMsg.slice(0, 4000) : rawMsg;
  let metadata: Record<string, unknown> | null | undefined;
  if (!("metadata" in body)) metadata = undefined;
  else if (body.metadata === null) metadata = null;
  else if (typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata)) {
    metadata = attachServerTelemetry(body.metadata as Record<string, unknown>);
    try {
      if (metadata && JSON.stringify(metadata).length > 24000) {
        metadata = { truncated: true, reason: "metadata_too_large" };
      }
    } catch {
      metadata = { truncated: true, reason: "metadata_not_serializable" };
    }
  } else {
    metadata = undefined;
  }

  const { SystemLogService } = await import("@/services/SystemLogService");
  await SystemLogService.insertLog(userId, level, message, metadata);

  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });
