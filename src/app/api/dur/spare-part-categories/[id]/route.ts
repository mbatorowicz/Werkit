import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { requireDurFeature } from "@/lib/requireDurFeature";
import { CategoryHierarchyError } from "@/services/dur/categoryValidation";

export const dynamic = "force-dynamic";

export const PUT = withApiErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (Number.isNaN(categoryId)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);

    const { SparePartCategoryService } = await import("@/services/dur/SparePartCategoryService");
    const { parseHierarchyFields } = await import("@/services/categoryHierarchyValidation");

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.color !== undefined) updateData.color = String(body.color);

    const hierarchy = parseHierarchyFields(body as Record<string, unknown>);
    updateData.parentId = hierarchy.parentId;
    updateData.isGroup = hierarchy.isGroup;
    updateData.sortOrder = hierarchy.sortOrder;

    await SparePartCategoryService.updateCategory(companyId, categoryId, updateData);

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof CategoryHierarchyError) return jsonError(err.code, 400);
      return null;
    },
    defaultErrorCode: "save_error",
  }
);

export const DELETE = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (Number.isNaN(categoryId)) return jsonError("invalid_id", 400);

    const { SparePartCategoryService } = await import("@/services/dur/SparePartCategoryService");
    await SparePartCategoryService.deleteCategory(companyId, categoryId);

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof CategoryHierarchyError) return jsonError(err.code, 400);
      return null;
    },
    defaultErrorCode: "delete_error",
  }
);
