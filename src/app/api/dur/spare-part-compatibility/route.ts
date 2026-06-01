import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/dur/spare-part-compatibility?partId=X
 * GET /api/dur/spare-part-compatibility?machineCategoryId=X
 */
export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const url = new URL(request.url);
    const partIdParam = url.searchParams.get("partId");
    const machineCategoryIdParam = url.searchParams.get("machineCategoryId");

    const { SparePartCompatibilityService } =
      await import("@/services/dur/SparePartCompatibilityService");

    if (partIdParam) {
      const partId = parseInt(partIdParam, 10);
      if (Number.isNaN(partId)) return jsonError("invalid_part_id", 400);
      const rows = await SparePartCompatibilityService.getForPart(partId, companyId);
      return jsonOk(rows);
    }

    if (machineCategoryIdParam) {
      const categoryId = parseInt(machineCategoryIdParam, 10);
      if (Number.isNaN(categoryId)) return jsonError("invalid_category_id", 400);
      const rows = await SparePartCompatibilityService.getForMachineCategory(categoryId, companyId);
      return jsonOk(rows);
    }

    return jsonError("missing_params", 400);
  },
  { defaultErrorCode: "fetch_error" }
);

/**
 * POST /api/dur/spare-part-compatibility
 * Body: { partId, categoryId, notes? }
 */
export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const body = await parseJsonBody(request);
    const partId = parseInt(String(body.partId), 10);
    const categoryId = parseInt(String(body.categoryId), 10);

    if (Number.isNaN(partId) || Number.isNaN(categoryId)) {
      return jsonError("missing_fields", 400);
    }

    const notes = typeof body.notes === "string" ? body.notes : undefined;

    const { SparePartCompatibilityService } =
      await import("@/services/dur/SparePartCompatibilityService");
    await SparePartCompatibilityService.add(partId, categoryId, companyId, notes);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" }
);
