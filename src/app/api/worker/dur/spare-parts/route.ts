import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { DurCatalogService } from "@/services/dur/DurCatalogService";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const dynamic = "force-dynamic";

/** GET /api/worker/dur/spare-parts — katalog części ze stanem (worker, naprawy). */
export const GET = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const flags = await PlatformFeatureFlagService.getFlags(ctx.companyId);
    if (!flags.durEnabled) return jsonError("feature_disabled", 403);

    const url = new URL(request.url);
    const groupIdRaw = url.searchParams.get("compatibleWithResourceGroupId");
    const compatibleWithResourceGroupId = groupIdRaw != null ? parseInt(groupIdRaw, 10) : undefined;

    const parts = await DurCatalogService.getPartsWithStock(ctx.companyId, {
      compatibleWithResourceGroupId:
        compatibleWithResourceGroupId != null && !Number.isNaN(compatibleWithResourceGroupId)
          ? compatibleWithResourceGroupId
          : undefined,
    });

    return jsonOk(parts);
  },
  { defaultErrorCode: "fetch_error" }
);
