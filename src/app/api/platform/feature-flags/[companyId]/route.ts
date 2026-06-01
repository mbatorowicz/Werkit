import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";
import type { FeatureFlags } from "@/types/featureFlags";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/feature-flags/:companyId
 * Zwraca aktualne flagi funkcji dla organizacji.
 */
export const GET = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ companyId: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const companyId = parsePositiveIntFromString((await context.params).companyId);
    if (companyId == null) return jsonError("invalid_id", 400);

    const flags = await PlatformFeatureFlagService.getFlags(companyId);
    return jsonOk({ flags });
  },
  { defaultErrorCode: "fetch_error" }
);

/**
 * PUT /api/platform/feature-flags/:companyId
 * Aktualizuje wybrane flagi funkcji dla organizacji.
 * Przyjmuje Partial<FeatureFlags> — tylko podane klucze zostaną zmienione.
 */
export const PUT = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ companyId: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const companyId = parsePositiveIntFromString((await context.params).companyId);
    if (companyId === null) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const flags: Partial<FeatureFlags> = {};

    // Bezpieczne wyciągnięcie tylko boolean pól
    const allowedKeys: (keyof FeatureFlags)[] = [
      "gpsTrackingEnabled",
      "mapViewEnabled",
      "geofencingEnabled",
      "routePlanningEnabled",
      "navigationEnabled",
      "durEnabled",
    ];
    for (const key of allowedKeys) {
      if (typeof body[key] === "boolean") {
        flags[key] = body[key] as boolean;
      }
    }

    if (Object.keys(flags).length === 0) {
      return jsonError("invalid_payload", 400);
    }

    const updated = await PlatformFeatureFlagService.updateFlags(companyId, flags);
    return jsonOk({ success: true, flags: updated });
  },
  { defaultErrorCode: "save_error" }
);
