import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import {
  isMissingResourcesVehicleColumns,
} from '@/lib/postgresMigrationHints';
import { buildResourceCanonicalName } from '@/lib/resourceDisplayName';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

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
    mapUnknownError: (err) => (isMissingResourcesVehicleColumns(err) ? jsonError("migration_required", 503) : null),
    defaultErrorCode: "fetch_error",
  },
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const body = await parseJsonBody(request);
    const brand = typeof body.brand === "string" ? body.brand : "";
    const model = typeof body.model === "string" ? body.model : "";
    const registrationNumber = typeof body.registrationNumber === "string" ? body.registrationNumber : "";
    const description = typeof body.description === "string" ? body.description : "";
    const categoryIds = body.categoryIds;
    const imageUrl = body.imageUrl;

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return jsonError("missing_fields", 400);
    }
    const parsedCatIds = categoryIds
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

    await DictionaryService.addResource(
      companyId,
      {
        name,
        brand: vis.showResourceName ? brand : "",
        model: vis.showResourceName ? model : "",
        registrationNumber: vis.showRegistrationNumber ? registrationNumber : "",
        description: vis.showResourceDescription ? description : null,
      },
      parsedCatIds,
      typeof imageUrl === "string" || imageUrl === null ? imageUrl : undefined,
    );

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => (isMissingResourcesVehicleColumns(err) ? jsonError("migration_required", 503) : null),
    defaultErrorCode: "save_error",
  },
);
