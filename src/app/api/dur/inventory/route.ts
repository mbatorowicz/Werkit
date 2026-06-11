import { normalizeDecimalBodyField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { requireDurFeature } from "@/lib/requireDurFeature";
import { StockMovementError } from "@/services/dur/StockMovementError";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const partIdParam = new URL(request.url).searchParams.get("partId");
    const partId = partIdParam ? parseInt(partIdParam, 10) : undefined;

    const { InventoryService } = await import("@/services/dur/InventoryService");
    const inventory = await InventoryService.getInventory(companyId, { partId });
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

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const body = await parseJsonBody(request);
    const partId =
      typeof body.partId === "number" ? body.partId : parseInt(String(body.partId), 10);
    const quantity = normalizeDecimalBodyField(body.quantity);
    if (!partId || Number.isNaN(partId)) {
      return jsonError("missing_part_id", 400);
    }
    if (quantity == null) {
      return jsonError("invalid_quantity", 400);
    }

    const { InventoryService } = await import("@/services/dur/InventoryService");
    try {
      await InventoryService.setQuantity(companyId, partId, quantity);
    } catch (err) {
      if (err instanceof StockMovementError) {
        return jsonError(err.code, 400);
      }
      throw err;
    }

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" }
);
