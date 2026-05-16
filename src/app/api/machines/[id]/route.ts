import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { isMissingResourcesVehicleColumns } from "@/lib/postgresMigrationHints";
import { buildResourceCanonicalName } from "@/lib/resourceDisplayName";
import { requireCompanyScopedSession } from '@/lib/apiTenant';

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
    const brand = typeof body.brand === "string" ? body.brand : "";
    const model = typeof body.model === "string" ? body.model : "";
    const registrationNumber = typeof body.registrationNumber === "string" ? body.registrationNumber : "";
    const description = typeof body.description === "string" ? body.description : "";

    if (!body.categoryIds || !Array.isArray(body.categoryIds)) {
      return jsonError("missing_fields", 400);
    }
    const parsedCatIds = body.categoryIds
      .map((c: string | number) => parseInt(String(c), 10))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    if (parsedCatIds.length === 0) {
      return jsonError("missing_fields", 400);
    }
    const { DictionaryService } = await import("@/services/DictionaryService");
    const vis = await DictionaryService.mergeResourceFormVisibility(companyId, parsedCatIds);
    const name = buildResourceCanonicalName(
      vis.showResourceName ? brand : "",
      vis.showResourceName ? model : "",
      vis.showRegistrationNumber ? registrationNumber : "",
      vis.showResourceDescription ? description : null,
    );
    if (!name.trim()) {
      return jsonError("missing_fields", 400);
    }

    await DictionaryService.updateResource(
      companyId,
      id,
      {
        name,
        brand: vis.showResourceName ? brand : "",
        model: vis.showResourceName ? model : "",
        registrationNumber: vis.showRegistrationNumber ? registrationNumber : "",
        description: vis.showResourceDescription ? description : null,
        imageUrl: body.imageUrl === null || typeof body.imageUrl === "string" ? body.imageUrl : undefined,
      },
      parsedCatIds,
    );

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => (isMissingResourcesVehicleColumns(err) ? jsonError("migration_required", 503) : null),
    defaultErrorCode: "save_error",
  },
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
  { defaultErrorCode: "machine_in_use" },
);
