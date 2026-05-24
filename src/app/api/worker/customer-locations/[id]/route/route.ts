import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { getAuthSession } from "@/lib/auth";
import { parseRouteWaypoints } from "@/lib/map/routeWaypoints";
import { AdminUserService } from "@/services/AdminUserService";
import { CustomerLocationService } from "@/services/CustomerLocationService";

export const PUT = withApiErrorHandling(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await getAuthSession();
  if (!session?.userId) return jsonError("unauthorized", 401);

  if (!(await AdminUserService.userCanEditRoute(session.userId))) {
    return jsonError("forbidden", 403);
  }

  const { id } = await ctx.params;
  const locId = Number.parseInt(id, 10);
  if (!Number.isFinite(locId) || locId < 1) return jsonError("invalid_id", 400);

  const body = await parseJsonBody(req);
  const waypoints = parseRouteWaypoints(body.waypoints);
  const row = await CustomerLocationService.setRouteWaypoints(locId, waypoints);
  if (!row) return jsonError("not_found", 404);
  return jsonOk(row);
}, { defaultErrorCode: "save_error" });
