import { jsonError } from "@/lib/apiRoute";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

type DurFeatureGuardResult =
  | { ok: true }
  | { ok: false; response: ReturnType<typeof jsonError> };

/** Blokuje endpointy DUR, gdy organizacja nie ma włączonego modułu utrzymania ruchu. */
export async function requireDurFeature(companyId: number): Promise<DurFeatureGuardResult> {
  const flags = await PlatformFeatureFlagService.getFlags(companyId);
  if (!flags.durEnabled) {
    return { ok: false, response: jsonError("feature_disabled", 403) };
  }
  return { ok: true };
}
