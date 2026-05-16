import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const PUT = withApiErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  const { companyId } = scoped.data;

  const params = await context.params;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

  const body = await parseJsonBody(request);
  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) return jsonError("missing_fields", 400);

  const categoryIds: number[] | undefined = Array.isArray(body.categoryIds)
    ? body.categoryIds.map((c: string | number) => parseInt(String(c), 10)).filter((n: number) => !Number.isNaN(n))
    : undefined;

  if (categoryIds !== undefined && categoryIds.length === 0) {
    return jsonError("missing_material_category", 400);
  }

  const { DictionaryService } = await import("@/services/DictionaryService");
  await DictionaryService.updateMaterial(companyId, id, { name }, categoryIds);

  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });

export const DELETE = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.deleteMaterial(companyId, id);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "material_in_use" },
);
