import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import { PlatformCompanyService } from "@/services/PlatformCompanyService";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";
import { isCompanyPlanKey, resolvePlanFlagPatch } from "@/lib/companyLifecycle";
import type { FeatureFlags } from "@/types/featureFlags";

export const dynamic = "force-dynamic";

const ALLOWED_FLAG_KEYS: (keyof FeatureFlags)[] = [
  "gpsTrackingEnabled",
  "mapViewEnabled",
  "geofencingEnabled",
  "routePlanningEnabled",
  "navigationEnabled",
  "durEnabled",
];

/**
 * GET /api/platform/feature-flags/:companyId
 * Zwraca aktualne flagi funkcji i klucz pakietu dla organizacji.
 */
export const GET = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ companyId: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const companyId = parsePositiveIntFromString((await context.params).companyId);
    if (companyId == null) return jsonError("invalid_id", 400);

    const [flags, company] = await Promise.all([
      PlatformFeatureFlagService.getFlags(companyId),
      PlatformCompanyService.getCompanyById(companyId),
    ]);
    const planKey = company && isCompanyPlanKey(company.planKey) ? company.planKey : null;
    return jsonOk({ flags, planKey });
  },
  { defaultErrorCode: "fetch_error" }
);

/**
 * PUT /api/platform/feature-flags/:companyId
 * Preset (`planKey` field_ops / field_ops_mro / yard) nadpisuje pełny zestaw flag.
 * Ręczny patch bez presetu ustawia `plan_key = custom`.
 */
export const PUT = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ companyId: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const companyId = parsePositiveIntFromString((await context.params).companyId);
    if (companyId === null) return jsonError("invalid_id", 400);

    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company) return jsonError("not_found", 404);

    const body = await parseJsonBody(request);
    const flags: Partial<FeatureFlags> = {};
    for (const key of ALLOWED_FLAG_KEYS) {
      if (typeof body[key] === "boolean") {
        flags[key] = body[key] as boolean;
      }
    }

    const resolved = resolvePlanFlagPatch({ planKey: body.planKey, flags });
    if ("error" in resolved) {
      return jsonError("invalid_payload", 400);
    }

    const previous = await PlatformFeatureFlagService.getFlags(companyId);
    const updated = await PlatformFeatureFlagService.updateFlags(companyId, resolved.flags);
    await PlatformCompanyService.updateCompany(companyId, { planKey: resolved.planKey });
    await PlatformAuditService.insert({
      actorUserId: auth.userId,
      companyId,
      action: "flags.update",
      targetType: "flags",
      targetId: companyId,
      metadata: { planKey: resolved.planKey, flags: updated, from: previous },
    });
    return jsonOk({ success: true, flags: updated, planKey: resolved.planKey });
  },
  { defaultErrorCode: "save_error" }
);
