// ============================================================
// API: Pojedyncza część w zleceniu naprawy (worker) — DELETE
// ============================================================

import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";
import { StockMovementError } from "@/services/dur/StockMovementError";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const dynamic = "force-dynamic";

/** DELETE /api/worker/work-orders/[id]/spare-parts/[partId] — usuń część ze zlecenia (pracownik) */
export const DELETE = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string; partId: string }> }) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    // Sprawdź, czy organizacja ma włączony moduł DUR
    const flags = await PlatformFeatureFlagService.getFlags(ctx.companyId);
    if (!flags.durEnabled) return jsonError("feature_disabled", 403);

    const { id, partId } = await params;
    const workOrderId = parseInt(id, 10);
    const sparePartId = parseInt(partId, 10);
    if (Number.isNaN(workOrderId) || Number.isNaN(sparePartId)) return jsonError("invalid_id", 400);

    // Weryfikacja: zlecenie należy do firmy
    const orderBelongs = await WorkOrderSparePartService.verifyOrderBelongsToCompany(
      workOrderId,
      ctx.companyId
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
        ctx.companyId,
        ctx.userId,
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
