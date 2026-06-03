// ============================================================
// API: Pojedyncza część w zleceniu naprawy (admin) — PATCH / DELETE
// ============================================================

import { normalizeDecimalBodyField, parsePositiveDecimalField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";
import { StockMovementError } from "@/services/dur/StockMovementError";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/work-orders/[id]/spare-parts/[partId] — aktualizuj ilość/cenę/notatki */
export const PATCH = withApiErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string; partId: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    // Feature flag: DUR musi być włączony
    const flags = await PlatformFeatureFlagService.getFlags(scoped.data.companyId);
    if (!flags.durEnabled) return jsonError("feature_disabled", 403);

    const { id, partId } = await params;
    const workOrderId = parseInt(id, 10);
    const sparePartId = parseInt(partId, 10);
    if (Number.isNaN(workOrderId) || Number.isNaN(sparePartId)) return jsonError("invalid_id", 400);

    // Weryfikacja: zlecenie należy do firmy
    const orderBelongs = await WorkOrderSparePartService.verifyOrderBelongsToCompany(
      workOrderId,
      scoped.data.companyId
    );
    if (!orderBelongs) return jsonError("not_found", 404);

    // Weryfikacja: część należy do zlecenia
    const belongs = await WorkOrderSparePartService.assertPartBelongsToOrder(
      sparePartId,
      workOrderId
    );
    if (!belongs) return jsonError("not_found", 404);

    const body = await parseJsonBody(request);
    let quantity: string | undefined;
    if (body.quantity !== undefined) {
      const q = parsePositiveDecimalField(body.quantity);
      if (!q.ok) return jsonError("invalid_quantity", 400);
      quantity = q.value;
    }
    let unitPrice: string | null | undefined;
    if (body.unitPrice !== undefined) {
      if (body.unitPrice === null || String(body.unitPrice).trim() === "") {
        unitPrice = null;
      } else {
        const p = normalizeDecimalBodyField(body.unitPrice);
        if (p == null) return jsonError("invalid_price", 400);
        unitPrice = p;
      }
    }
    const notes =
      body.notes !== undefined ? (typeof body.notes === "string" ? body.notes : null) : undefined;

    try {
      const updated = await WorkOrderSparePartService.updatePartInOrderWithStock(
        scoped.data.companyId,
        scoped.data.session.userId as number,
        sparePartId,
        workOrderId,
        { quantity, unitPrice, notes }
      );

      if (!updated) return jsonError("not_found", 404);
      return jsonOk(updated);
    } catch (err) {
      if (err instanceof StockMovementError) {
        return jsonError(err.code, 400);
      }
      throw err;
    }
  },
  { defaultErrorCode: "save_error" }
);

/** DELETE /api/admin/work-orders/[id]/spare-parts/[partId] — usuń część ze zlecenia */
export const DELETE = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string; partId: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    // Feature flag: DUR musi być włączony
    const flags = await PlatformFeatureFlagService.getFlags(scoped.data.companyId);
    if (!flags.durEnabled) return jsonError("feature_disabled", 403);

    const { id, partId } = await params;
    const workOrderId = parseInt(id, 10);
    const sparePartId = parseInt(partId, 10);
    if (Number.isNaN(workOrderId) || Number.isNaN(sparePartId)) return jsonError("invalid_id", 400);

    // Weryfikacja: zlecenie należy do firmy
    const orderBelongs = await WorkOrderSparePartService.verifyOrderBelongsToCompany(
      workOrderId,
      scoped.data.companyId
    );
    if (!orderBelongs) return jsonError("not_found", 404);

    // Weryfikacja: część należy do zlecenia
    const belongs = await WorkOrderSparePartService.assertPartBelongsToOrder(
      sparePartId,
      workOrderId
    );
    if (!belongs) return jsonError("not_found", 404);

    try {
      const deleted = await WorkOrderSparePartService.returnPartToWarehouse(
        scoped.data.companyId,
        scoped.data.session.userId as number,
        sparePartId,
        workOrderId
      );
      if (!deleted) return jsonError("not_found", 404);

      return jsonOk({ success: true, returned: true });
    } catch (err) {
      if (err instanceof StockMovementError) {
        return jsonError(err.code, 400);
      }
      throw err;
    }
  },
  { defaultErrorCode: "delete_error" }
);
