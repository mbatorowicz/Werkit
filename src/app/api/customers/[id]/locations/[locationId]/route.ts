import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { CustomerLocationService } from "@/services/CustomerLocationService";
import { parseRouteWaypoints } from "@/lib/map/routeWaypoints";

export const PUT = withApiErrorHandling(async (req: Request, ctx: { params: Promise<{ id: string; locationId: string }> }) => {
  const denied = await guardAdminMutation();
  if (denied) return denied;
  const { locationId } = await ctx.params;
  const locId = Number.parseInt(locationId, 10);
  if (!Number.isFinite(locId) || locId < 1) return jsonError("invalid_id", 400);
  const body = await parseJsonBody(req);
  const patch: Parameters<typeof CustomerLocationService.updateLocation>[1] = {};
  if (typeof body.label === "string") patch.label = body.label.trim();
  if (body.address !== undefined) patch.address = typeof body.address === "string" ? body.address : null;
  if (body.latitude != null) patch.latitude = String(body.latitude);
  if (body.longitude != null) patch.longitude = String(body.longitude);
  if (body.isDefault === true) patch.isDefault = true;
  if (body.routeWaypoints !== undefined) patch.routeWaypoints = parseRouteWaypoints(body.routeWaypoints);
  const row = await CustomerLocationService.updateLocation(locId, patch);
  if (!row) return jsonError("not_found", 404);
  return jsonOk(row);
}, { defaultErrorCode: "save_error" });

export const DELETE = withApiErrorHandling(async (_req: Request, ctx: { params: Promise<{ id: string; locationId: string }> }) => {
  const denied = await guardAdminMutation();
  if (denied) return denied;
  const { locationId } = await ctx.params;
  const locId = Number.parseInt(locationId, 10);
  if (!Number.isFinite(locId) || locId < 1) return jsonError("invalid_id", 400);
  await CustomerLocationService.deleteLocation(locId);
  return jsonOk({ success: true });
}, { defaultErrorCode: "delete_error" });
