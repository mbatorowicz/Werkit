import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import {
  parseMachineCategoryIds,
  parseMachineTextFields,
  visibleMachineFields,
} from "@/lib/machineRoutePayload";
import { isMissingResourcesVehicleColumns } from "@/lib/postgresMigrationHints";
import { buildResourceCanonicalName } from "@/lib/resourceDisplayName";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

function parseResourceGroupId(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const { DictionaryService } = await import("@/services/DictionaryService");
    const allMachines = await DictionaryService.getResources(companyId);
    return jsonOk(allMachines);
  },
  {
    mapUnknownError: (err) =>
      isMissingResourcesVehicleColumns(err) ? jsonError("migration_required", 503) : null,
    defaultErrorCode: "fetch_error",
  }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const body = await parseJsonBody(request);
    const fields = parseMachineTextFields(body);
    const imageUrl = body.imageUrl;

    const parsedCatIds = parseMachineCategoryIds(body.categoryIds);
    if (!parsedCatIds) {
      return jsonError("missing_fields", 400);
    }
    const { DictionaryService } = await import("@/services/DictionaryService");
    const vis = await DictionaryService.mergeResourceFormVisibility(companyId, parsedCatIds);
    const visible = visibleMachineFields(vis, fields);
    const name = buildResourceCanonicalName(
      visible.brand,
      visible.model,
      visible.registrationNumber,
      visible.description
    );
    if (!name.trim()) {
      return jsonError("missing_fields", 400);
    }

    await DictionaryService.addResource(
      companyId,
      {
        name,
        ...visible,
      },
      parsedCatIds,
      typeof imageUrl === "string" || imageUrl === null ? imageUrl : undefined,
      parseResourceGroupId(body.resourceGroupId)
    );

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) =>
      isMissingResourcesVehicleColumns(err) ? jsonError("migration_required", 503) : null,
    defaultErrorCode: "save_error",
  }
);
