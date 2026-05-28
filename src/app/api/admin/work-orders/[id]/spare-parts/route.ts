// ============================================================
// API: CRUD części zamiennych w zleceniu naprawy (admin)
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { WorkOrderSparePartService } from "@/services/dur/WorkOrderSparePartService";
import { AdminOrderService } from "@/services/AdminOrderService";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workOrders } from "@/db/schema";

export const dynamic = 'force-dynamic';

/** GET /api/admin/work-orders/[id]/spare-parts — lista części w zleceniu */
export const GET = withApiErrorHandling(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const workOrderId = parseInt(id, 10);
  if (Number.isNaN(workOrderId)) return jsonError("invalid_id", 400);

  // Weryfikacja: zlecenie należy do firmy
  const [order] = await db
    .select({ id: workOrders.id })
    .from(workOrders)
    .where(and(eq(workOrders.id, workOrderId), eq(workOrders.companyId, scoped.data.companyId)))
    .limit(1);
  if (!order) return jsonError("not_found", 404);

  const parts = await WorkOrderSparePartService.getPartsForOrder(workOrderId);
  return jsonOk(parts);
}, { defaultErrorCode: "fetch_error" });

/** POST /api/admin/work-orders/[id]/spare-parts — dodaj część do zlecenia */
export const POST = withApiErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const workOrderId = parseInt(id, 10);
  if (Number.isNaN(workOrderId)) return jsonError("invalid_id", 400);

  // Weryfikacja: zlecenie należy do firmy
  const [order] = await db
    .select({ id: workOrders.id })
    .from(workOrders)
    .where(and(eq(workOrders.id, workOrderId), eq(workOrders.companyId, scoped.data.companyId)))
    .limit(1);
  if (!order) return jsonError("not_found", 404);

  const body = await parseJsonBody(request);
  const partId = parseInt(String(body.partId), 10);
  if (!partId || Number.isNaN(partId)) return jsonError("missing_part_id", 400);

  const quantity = typeof body.quantity === "string" ? body.quantity : "1";
  const unitPrice = typeof body.unitPrice === "string" ? body.unitPrice : null;
  const notes = typeof body.notes === "string" ? body.notes : null;

  const inserted = await WorkOrderSparePartService.addPartToOrder(workOrderId, {
    partId,
    quantity,
    unitPrice,
    notes,
  });

  return jsonOk(inserted);
}, { defaultErrorCode: "save_error" });
