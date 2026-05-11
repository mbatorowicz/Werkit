import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { isMissingMaterialCategoriesTables } from '@/lib/postgresMigrationHints';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(
  async () => {
    const { DictionaryService } = await import("@/services/DictionaryService");
    const rows = await DictionaryService.getMaterialCategories();
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

    const body = await parseJsonBody(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return jsonError("missing_name", 400);
    }
    const color = typeof body.color === "string" ? body.color : "#3f3f46";
    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.addMaterialCategory({ name, color });
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" },
);
