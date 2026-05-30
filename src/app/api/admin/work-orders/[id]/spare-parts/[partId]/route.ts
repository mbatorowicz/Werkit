// ============================================================
// API: Pojedyncza część w zleceniu naprawy (admin) — PATCH / DELETE
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const dynamic = 'force-dynamic';

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
    const orderBelongs = await WorkOrderSparePartService.verifyOrderBelongsToCompany(workOrderId, scoped.data.companyId);
    if (!orderBelongs) return jsonError("not_found", 404);

    // Weryfikacja: część należy do zlecenia
    const belongs = await WorkOrderSparePartService.assertPartBelongsToOrder(sparePartId, workOrderId);
    if (!belongs) return jsonError("not_found", 404);

    const body = await parseJsonBody(request);
    const quantity = typeof body.quantity === "string" ? body.quantity : undefined;
    const unitPrice = body.unitPrice !== undefined
      ? (typeof body.unitPrice === "string" ? body.unitPrice : null)
      : undefined;
    const notes = body.notes !== undefined
      ? (typeof body.notes === "string" ? body.notes : null)
      : undefined;

    const updated = await WorkOrderSparePartService.updatePartInOrder(sparePartId, {
      quantity,
      unitPrice,
      notes,
    });

    if (!updated) return jsonError("not_found", 404);
    return jsonOk(updated);
  },
  { defaultErrorCode: "save_error" },
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
    const orderBelongs = await WorkOrderSparePartService.verifyOrderBelongsToCompany(workOrderId, scoped.data.companyId);
    if (!orderBelongs) return jsonError("not_found", 404);

    // Weryfikacja: część należy do zlecenia
    const belongs = await WorkOrderSparePartService.assertPartBelongsToOrder(sparePartId, workOrderId);
    if (!belongs) return jsonError("not_found", 404);

    const deleted = await WorkOrderSparePartService.removePartFromOrder(sparePartId);
    if (!deleted) return jsonError("not_found", 404);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "delete_error" },
);
