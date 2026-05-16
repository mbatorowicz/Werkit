import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { isMissingMaterialCategoriesTables } from '@/lib/postgresMigrationHints';
import { CategoryHierarchyError } from '@/services/categoryHierarchyValidation';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const leavesOnly = new URL(request.url).searchParams.get("leavesOnly") === "1";
    const { DictionaryService } = await import("@/services/DictionaryService");
    const rows = await DictionaryService.getMaterialCategories(companyId, { leavesOnly });
    return jsonOk(rows);
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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return jsonError("missing_name", 400);
    }
    const color = typeof body.color === "string" ? body.color : "#3f3f46";
    const { DictionaryService } = await import("@/services/DictionaryService");
    const { parseHierarchyFields } = await import("@/services/categoryHierarchyValidation");
    const hierarchy = parseHierarchyFields(body as Record<string, unknown>);
    await DictionaryService.addMaterialCategory(companyId, {
      name,
      color,
      parentId: hierarchy.parentId,
      isGroup: hierarchy.isGroup,
      sortOrder: hierarchy.sortOrder,
    });
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof CategoryHierarchyError) return jsonError(err.code, 400);
      if (isMissingMaterialCategoriesTables(err)) return jsonError("migration_material_categories", 503);
      return null;
    },
    defaultErrorCode: "save_error",
  },
);
