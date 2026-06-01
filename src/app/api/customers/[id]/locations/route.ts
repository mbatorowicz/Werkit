import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { CustomerLocationService } from "@/services/CustomerLocationService";
import { parseRouteWaypoints } from "@/lib/map/routeWaypoints";

export const GET = withApiErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const { id } = await ctx.params;
    const customerId = Number.parseInt(id, 10);
    if (!Number.isFinite(customerId) || customerId < 1) return jsonError("invalid_id", 400);
    await CustomerLocationService.ensureDefaultFromLegacyCustomer(customerId, companyId);
    const locations = await CustomerLocationService.listByCustomerId(customerId, companyId);
    return jsonOk(locations);
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const { id } = await ctx.params;
    const customerId = Number.parseInt(id, 10);
    if (!Number.isFinite(customerId) || customerId < 1) return jsonError("invalid_id", 400);
    const body = await parseJsonBody(req);
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const latitude =
      body.latitude !== null && body.latitude !== undefined ? String(body.latitude) : "";
    const longitude =
      body.longitude !== null && body.longitude !== undefined ? String(body.longitude) : "";
    if (!label || !latitude || !longitude) return jsonError("missing_fields", 400);
    const row = await CustomerLocationService.createLocation({
      customerId,
      label,
      address: typeof body.address === "string" ? body.address : null,
      latitude,
      longitude,
      isDefault: body.isDefault === true,
      routeWaypoints: parseRouteWaypoints(body.routeWaypoints),
      companyId,
    });
    return jsonOk(row);
  },
  { defaultErrorCode: "save_error" }
);
