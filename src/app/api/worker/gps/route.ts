import { jsonError, jsonOk, parseJson, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { GpsService } from "@/services/GpsService";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const GET = withApiErrorHandling(
  async () => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const logs = await GpsService.getActiveSessionGpsLogs(ctx.userId, ctx.companyId);
    return jsonOk({ logs });
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    // Sprawdź, czy organizacja ma włączone śledzenie GPS
    const flags = await PlatformFeatureFlagService.getFlags(ctx.companyId);
    if (!flags.gpsTrackingEnabled) {
      return jsonError("feature_disabled", 403);
    }

    const body = await parseJson(request);
    const points: unknown[] = Array.isArray(body) ? body : [body];

    if (points.length === 0) return jsonOk({ success: true, count: 0, acknowledgedIds: [] });

    const acknowledgedIds = await GpsService.saveSessionPoints(ctx.userId, ctx.companyId, points);
    return jsonOk({ success: true, count: acknowledgedIds.length, acknowledgedIds });
  },
  {
    mapUnknownError: (err) => {
      if (!(err instanceof Error)) return null;
      if (err.message === "no_active_session") return jsonError("no_active_session", 400);
      if (
        ["invalid_gps_point", "gps_session_conflict", "gps_stationary_session"].includes(
          err.message
        )
      )
        return jsonError(err.message, 409);
      if (err.message === "payload_too_large") return jsonError("payload_too_large", 400);
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
