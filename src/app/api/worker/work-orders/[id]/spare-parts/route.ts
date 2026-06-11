// ============================================================
// API: CRUD części zamiennych w zleceniu naprawy (worker)
// ============================================================

import { normalizeDecimalBodyField, parsePositiveDecimalField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";
import { StockMovementError } from "@/services/dur/StockMovementError";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const dynamic = "force-dynamic";

/** GET /api/worker/work-orders/[id]/spare-parts — lista części w zleceniu (widok pracownika) */
export const GET = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    // Sprawdź, czy organizacja ma włączony moduł DUR
    const flags = await PlatformFeatureFlagService.getFlags(ctx.companyId);
    if (!flags.durEnabled) return jsonError("feature_disabled", 403);

    const { id } = await params;
    const workOrderId = parseInt(id, 10);
    if (Number.isNaN(workOrderId)) return jsonError("invalid_id", 400);

    const belongs = await WorkOrderSparePartService.verifyWorkerHasActiveOrderSession(
      workOrderId,
      ctx.userId,
      ctx.companyId
    );
    if (!belongs) return jsonError("not_found", 404);

    const parts = await WorkOrderSparePartService.getPartsForOrder(workOrderId);
    return jsonOk(parts);
  },
  { defaultErrorCode: "fetch_error" }
);

/** POST /api/worker/work-orders/[id]/spare-parts — dodaj część do zlecenia (pracownik w trakcie naprawy) */
export const POST = withApiErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    // Sprawdź, czy organizacja ma włączony moduł DUR
    const flags = await PlatformFeatureFlagService.getFlags(ctx.companyId);
    if (!flags.durEnabled) return jsonError("feature_disabled", 403);

    const { id } = await params;
    const workOrderId = parseInt(id, 10);
    if (Number.isNaN(workOrderId)) return jsonError("invalid_id", 400);

    const belongs = await WorkOrderSparePartService.verifyWorkerHasActiveOrderSession(
      workOrderId,
      ctx.userId,
      ctx.companyId
    );
    if (!belongs) return jsonError("not_found", 404);

    const body = await parseJsonBody(request);
    const partId = parseInt(String(body.partId), 10);
    if (!partId || Number.isNaN(partId)) return jsonError("missing_part_id", 400);

    const qtyParsed = parsePositiveDecimalField(
      body.quantity != null && String(body.quantity).trim() !== "" ? body.quantity : "1"
    );
    if (!qtyParsed.ok) return jsonError("invalid_quantity", 400);

    let unitPrice: string | null = null;
    if (body.unitPrice != null && String(body.unitPrice).trim() !== "") {
      unitPrice = normalizeDecimalBodyField(body.unitPrice);
      if (unitPrice == null) return jsonError("invalid_price", 400);
    }
    const notes = typeof body.notes === "string" ? body.notes : null;

    try {
      const inserted = await WorkOrderSparePartService.pickPartFromWarehouse(
        ctx.companyId,
        ctx.userId,
        workOrderId,
        { partId, quantity: qtyParsed.value, unitPrice, notes, issuedTo: ctx.userId }
      );

      return jsonOk(inserted);
    } catch (err) {
      if (err instanceof StockMovementError) {
        return jsonError(err.code, 400);
      }
      throw err;
    }
  },
  { defaultErrorCode: "save_error" }
);
