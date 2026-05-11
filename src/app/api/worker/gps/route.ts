import { jsonError, jsonOk, parseJson, withApiErrorHandling } from "@/lib/apiRoute";
import { getUserId } from '@/lib/auth';
import { GpsService, GpsPoint } from '@/services/GpsService';

export const GET = withApiErrorHandling(async () => {
  const userId = await getUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const logs = await GpsService.getActiveSessionGpsLogs(userId);
  return jsonOk({ logs });
}, { defaultErrorCode: "fetch_error" });

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const userId = await getUserId();
    if (!userId) return jsonError("Unauthorized", 401);

    const body = await parseJson(request);
    const points: GpsPoint[] = Array.isArray(body) ? (body as GpsPoint[]) : [body as GpsPoint];

    if (points.length === 0) return jsonOk({ success: true, count: 0 });

    const savedCount = await GpsService.saveGpsLogs(userId, points);
    return jsonOk({ success: true, count: savedCount });
  },
  {
    mapUnknownError: (err) => (err instanceof Error && err.message === "no_active_session" ? jsonError("no_active_session", 400) : null),
    defaultErrorCode: "save_error",
  },
);
