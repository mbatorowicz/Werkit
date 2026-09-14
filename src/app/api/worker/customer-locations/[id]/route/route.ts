import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { parseRouteWaypoints } from "@/lib/map/routeWaypoints";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { AdminUserService } from "@/services/AdminUserService";
import { CustomerLocationService } from "@/services/CustomerLocationService";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const PUT = withApiErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const sessionResult = await requireWorkerCompanySession();
    if (!sessionResult.ok) return sessionResult.response;

    const { userId, companyId } = sessionResult;

    if (!(await AdminUserService.userCanEditRoute(userId))) {
      return jsonError("forbidden", 403);
    }

    const flags = await PlatformFeatureFlagService.getFlags(companyId);
    if (!flags.routePlanningEnabled) {
      return jsonError("feature_disabled", 403);
    }

    const { id } = await ctx.params;
    const locId = Number.parseInt(id, 10);
    if (!Number.isFinite(locId) || locId < 1) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(req);
    const waypoints = parseRouteWaypoints(body.waypoints);
    const row = await CustomerLocationService.setRouteWaypoints(locId, waypoints, companyId);
    if (!row) return jsonError("not_found", 404);
    return jsonOk(row);
  },
  { defaultErrorCode: "save_error" }
);
