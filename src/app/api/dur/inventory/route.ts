import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const partIdParam = new URL(request.url).searchParams.get("partId");
    const partId = partIdParam ? parseInt(partIdParam, 10) : undefined;

    const { InventoryService } = await import("@/services/dur/InventoryService");
    const inventory = await InventoryService.getInventory(companyId, { partId });
    return jsonOk(inventory);
  },
  { defaultErrorCode: "fetch_error" },
);

export const PUT = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const body = await parseJsonBody(request);
    const partId = typeof body.partId === "number" ? body.partId : parseInt(String(body.partId), 10);
    const quantity = typeof body.quantity === "string" ? body.quantity : String(body.quantity);

    if (!partId || Number.isNaN(partId)) {
      return jsonError("missing_part_id", 400);
    }

    const { InventoryService } = await import("@/services/dur/InventoryService");
    await InventoryService.setQuantity(companyId, partId, quantity);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" },
);
