import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import type { MaterialCategoryUpdateInput } from "@/services/DictionaryService";
import { guardAdminMutation } from "@/lib/requireAdminMutation";

export const PUT = withApiErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  const params = await context.params;
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return jsonError("invalid_id", 400);
  }
  const body = await parseJsonBody(request);
  const updateData: MaterialCategoryUpdateInput = {};
  if (typeof body.name === "string") updateData.name = body.name.trim();
  if (typeof body.color === "string") updateData.color = body.color;
  if (!updateData.name && !updateData.color) {
    return jsonError("missing_fields", 400);
  }

  const { DictionaryService } = await import("@/services/DictionaryService");
  await DictionaryService.updateMaterialCategory(id, updateData);
  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });

export const DELETE = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return jsonError("invalid_id", 400);
    }
    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.deleteMaterialCategory(id);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "material_in_use" },
);
