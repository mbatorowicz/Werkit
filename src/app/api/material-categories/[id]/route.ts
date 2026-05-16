import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import type { MaterialCategoryUpdateInput } from "@/services/DictionaryService";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { CategoryHierarchyError } from "@/services/categoryHierarchyValidation";
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const PUT = withApiErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
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
  const { parseHierarchyFields } = await import("@/services/categoryHierarchyValidation");
  const hierarchy = parseHierarchyFields(body as Record<string, unknown>);
  const updateData: MaterialCategoryUpdateInput = {
    parentId: hierarchy.parentId,
    isGroup: hierarchy.isGroup,
    sortOrder: hierarchy.sortOrder,
  };
  if (typeof body.name === "string") updateData.name = body.name.trim();
  if (typeof body.color === "string") updateData.color = body.color;
  if (!updateData.name && !updateData.color && body.parentId === undefined && body.isGroup === undefined) {
    return jsonError("missing_fields", 400);
  }

  const { DictionaryService } = await import("@/services/DictionaryService");
  await DictionaryService.updateMaterialCategory(companyId, id, updateData);
  return jsonOk({ success: true });
}, {
  mapUnknownError: (err) => (err instanceof CategoryHierarchyError ? jsonError(err.code, 400) : null),
  defaultErrorCode: "save_error",
});

export const DELETE = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
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
    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.deleteMaterialCategory(companyId, id);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => (err instanceof CategoryHierarchyError ? jsonError(err.code, 400) : null),
    defaultErrorCode: "material_in_use",
  },
);
