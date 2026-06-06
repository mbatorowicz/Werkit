import { normalizeDecimalBodyField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { requireDurFeature } from "@/lib/requireDurFeature";
import { CategoryHierarchyError } from "@/services/dur/categoryValidation";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const { id } = await params;
    const partId = parseInt(id, 10);
    if (Number.isNaN(partId)) return jsonError("invalid_id", 400);

    const { SparePartService } = await import("@/services/dur/SparePartService");
    const part = await SparePartService.getPart(companyId, partId);
    if (!part) return jsonError("not_found", 404);

    return jsonOk(part);
  },
  { defaultErrorCode: "fetch_error" }
);

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
    const partId = parseInt(id, 10);
    if (Number.isNaN(partId)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);

    const { SparePartService } = await import("@/services/dur/SparePartService");

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.catalogNumber !== undefined) updateData.catalogNumber = String(body.catalogNumber);
    if (body.manufacturer !== undefined) updateData.manufacturer = String(body.manufacturer);
    if (body.unit !== undefined) updateData.unit = String(body.unit);
    if (body.purchasePrice !== undefined) {
      if (body.purchasePrice === null || String(body.purchasePrice).trim() === "") {
        updateData.purchasePrice = null;
      } else {
        const pp = normalizeDecimalBodyField(body.purchasePrice);
        if (pp == null) return jsonError("invalid_price", 400);
        updateData.purchasePrice = pp;
      }
    }
    if (body.description !== undefined)
      updateData.description = typeof body.description === "string" ? body.description : null;
    if (body.minStock !== undefined) {
      if (body.minStock === null || String(body.minStock).trim() === "") {
        updateData.minStock = "0";
      } else {
        const ms = normalizeDecimalBodyField(body.minStock);
        if (ms == null) return jsonError("invalid_quantity", 400);
        updateData.minStock = ms;
      }
    }
    if (body.location !== undefined) updateData.location = String(body.location);
    if (body.imageUrl !== undefined)
      updateData.imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive === true;

    const categoryIds: number[] | undefined = Array.isArray(body.categoryIds)
      ? body.categoryIds
          .map((c: string | number) => parseInt(String(c), 10))
          .filter((n: number) => !Number.isNaN(n))
      : undefined;

    const parseIds = (arr: unknown) =>
      Array.isArray(arr)
        ? arr.map((c: string | number) => parseInt(String(c), 10)).filter((n: number) => !Number.isNaN(n))
        : [];

    const resourceGroupIds =
      body.resourceGroupIds !== undefined || body.machineCategoryIds !== undefined
        ? [...new Set([...parseIds(body.resourceGroupIds), ...parseIds(body.machineCategoryIds)])]
        : undefined;

    await SparePartService.updatePart(companyId, partId, {
      ...updateData,
      categoryIds,
      resourceGroupIds,
    } as Parameters<typeof SparePartService.updatePart>[2]);

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof CategoryHierarchyError) return jsonError(err.code, 400);
      if (err instanceof Error && err.message === "invalid_unit") return jsonError("invalid_unit", 400);
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
    const partId = parseInt(id, 10);
    if (Number.isNaN(partId)) return jsonError("invalid_id", 400);

    const { SparePartService } = await import("@/services/dur/SparePartService");
    await SparePartService.deletePart(companyId, partId);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "delete_error" }
);
