import { normalizeDecimalBodyField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const materialIdParam = new URL(request.url).searchParams.get("materialId");
    const materialId = materialIdParam ? parseInt(materialIdParam, 10) : undefined;

    const { MaterialInventoryService } =
      await import("@/services/materials/MaterialInventoryService");
    const inventory = await MaterialInventoryService.getInventory(companyId, {
      materialId: materialId && !Number.isNaN(materialId) ? materialId : undefined,
    });
    return jsonOk(inventory);
  },
  { defaultErrorCode: "fetch_error" }
);

export const PUT = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const body = await parseJsonBody(request);
    const materialId =
      typeof body.materialId === "number" ? body.materialId : parseInt(String(body.materialId), 10);
    const quantity = normalizeDecimalBodyField(body.quantity);
    if (!materialId || Number.isNaN(materialId)) {
      return jsonError("invalid_id", 400);
    }
    if (quantity == null) {
      return jsonError("invalid_quantity", 400);
    }

    const { MaterialInventoryService } =
      await import("@/services/materials/MaterialInventoryService");
    await MaterialInventoryService.setQuantity(companyId, materialId, quantity);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" }
);
