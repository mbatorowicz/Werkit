import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const { SparePartService } = await import("@/services/dur/SparePartService");
    const parts = await SparePartService.getParts(companyId);
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

    const machineCategoryIds: number[] = Array.isArray(body.machineCategoryIds)
      ? body.machineCategoryIds
          .map((c: string | number) => parseInt(String(c), 10))
          .filter((n: number) => !Number.isNaN(n))
      : [];

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
      machineCategoryIds,
    });

    return jsonOk({ id: partId, success: true });
  },
  { defaultErrorCode: "save_error" }
);
