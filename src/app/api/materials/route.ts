import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { isMissingMaterialCategoriesTables } from '@/lib/postgresMigrationHints';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const { DictionaryService } = await import("@/services/DictionaryService");
    const allMaterials = await DictionaryService.getMaterials(companyId);
    return jsonOk(allMaterials);
  },
  {
    mapUnknownError: (err) => (isMissingMaterialCategoriesTables(err) ? jsonError("migration_material_categories", 503) : null),
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
    const name = typeof body.name === "string" ? body.name : "";
    const categoryIds: number[] = Array.isArray(body.categoryIds)
      ? body.categoryIds
          .map((c: string | number) => parseInt(String(c), 10))
          .filter((n: number) => !Number.isNaN(n))
      : [];

    if (!name || categoryIds.length === 0) {
      return jsonError(!name ? "missing_fields" : "missing_material_category", 400);
    }

    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.addMaterial(companyId, name, categoryIds);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" },
);
