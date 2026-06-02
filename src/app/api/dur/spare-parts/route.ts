import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { requireDurFeature } from "@/lib/requireDurFeature";
import { CategoryHierarchyError } from "@/services/dur/categoryValidation";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const url = new URL(request.url);
    const groupIdRaw =
      url.searchParams.get("compatibleWithResourceGroupId") ??
      url.searchParams.get("compatibleWithCategoryId");
    const compatibleWithResourceGroupId =
      groupIdRaw != null ? parseInt(groupIdRaw, 10) : undefined;

    const { SparePartService } = await import("@/services/dur/SparePartService");
    const parts = await SparePartService.getParts(companyId, {
      compatibleWithResourceGroupId:
        compatibleWithResourceGroupId != null && !Number.isNaN(compatibleWithResourceGroupId)
          ? compatibleWithResourceGroupId
          : undefined,
    });
    return jsonOk(parts);
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const body = await parseJsonBody(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return jsonError("missing_fields", 400);
    }

    const categoryIds: number[] = Array.isArray(body.categoryIds)
      ? body.categoryIds
          .map((c: string | number) => parseInt(String(c), 10))
          .filter((n: number) => !Number.isNaN(n))
      : [];

    const parseIds = (arr: unknown) =>
      Array.isArray(arr)
        ? arr.map((c: string | number) => parseInt(String(c), 10)).filter((n: number) => !Number.isNaN(n))
        : [];

    const resourceGroupIds = [
      ...parseIds(body.resourceGroupIds),
      ...parseIds(body.machineCategoryIds),
    ];

    const { SparePartService } = await import("@/services/dur/SparePartService");
    const partId = await SparePartService.addPart(companyId, {
      name,
      catalogNumber: typeof body.catalogNumber === "string" ? body.catalogNumber : undefined,
      manufacturer: typeof body.manufacturer === "string" ? body.manufacturer : undefined,
      unit: typeof body.unit === "string" ? body.unit : undefined,
      purchasePrice:
        body.purchasePrice !== null && body.purchasePrice !== undefined
          ? String(body.purchasePrice)
          : null,
      description: typeof body.description === "string" ? body.description : null,
      minStock:
        body.minStock !== null && body.minStock !== undefined ? String(body.minStock) : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      isActive: body.isActive !== false,
      categoryIds,
      resourceGroupIds: [...new Set(resourceGroupIds)],
    });

    return jsonOk({ id: partId, success: true });
  },
  {
    mapUnknownError: (err) =>
      err instanceof CategoryHierarchyError ? jsonError(err.code, 400) : null,
    defaultErrorCode: "save_error",
  }
);
