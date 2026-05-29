// ============================================================
// API: Pojedyncza część w zleceniu naprawy (worker) — DELETE
// ============================================================

import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workOrders } from "@/db/schema";

export const dynamic = 'force-dynamic';

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
    const [order] = await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(and(eq(workOrders.id, workOrderId), eq(workOrders.companyId, ctx.companyId)))
      .limit(1);
    if (!order) return jsonError("not_found", 404);

    // Weryfikacja: część należy do zlecenia
    const belongs = await WorkOrderSparePartService.assertPartBelongsToOrder(sparePartId, workOrderId);
    if (!belongs) return jsonError("not_found", 404);

    const deleted = await WorkOrderSparePartService.removePartFromOrder(sparePartId);
    if (!deleted) return jsonError("not_found", 404);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "delete_error" },
);
