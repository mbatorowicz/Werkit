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

function parseUpdateResourceGroupId(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  return parseInt(String(raw), 10) > 0 ? parseInt(String(raw), 10) : null;
}

export const PUT = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return jsonError("invalid_id", 400);
    }
    const body = await parseJsonBody(request);
    const fields = parseMachineTextFields(body);

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

    await DictionaryService.updateResource(
      companyId,
      id,
      {
        name,
        ...visible,
        imageUrl:
          body.imageUrl === null || typeof body.imageUrl === "string" ? body.imageUrl : undefined,
        resourceGroupId: parseUpdateResourceGroupId(body.resourceGroupId),
      },
      parsedCatIds
    );

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) =>
      isMissingResourcesVehicleColumns(err) ? jsonError("migration_required", 503) : null,
    defaultErrorCode: "save_error",
  }
);

export const DELETE = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return jsonError("invalid_id", 400);
    }

    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.deleteResource(companyId, id);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "machine_in_use" }
);
