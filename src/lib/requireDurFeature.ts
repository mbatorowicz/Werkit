import { jsonError } from "@/lib/apiRoute";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

type DurFeatureGuardResult = { ok: true } | { ok: false; response: ReturnType<typeof jsonError> };

/**
 * Blokuje magazyn części i BOM naprawy (`/api/dur/*`, spare-parts worker/admin),
 * gdy organizacja nie ma włączonego modułu DUR.
 * Typ zasobu (`/api/resource-groups`) nie podlega tej bramce — to flota, nie magazyn.
 */
export async function requireDurFeature(companyId: number): Promise<DurFeatureGuardResult> {
  const flags = await PlatformFeatureFlagService.getFlags(companyId);
  if (!flags.durEnabled) {
    return { ok: false, response: jsonError("feature_disabled", 403) };
  }
  return { ok: true };
}
