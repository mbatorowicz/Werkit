import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const { StockMovementService } = await import("@/services/dur/StockMovementService");
    const issues = await StockMovementService.getIssues(companyId);
    return jsonOk(issues);
  },
  { defaultErrorCode: "fetch_error" },
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId, session } = scoped.data;
    const userId = session.userId;

    const body = await parseJsonBody(request);
    const partId = typeof body.partId === "number" ? body.partId : parseInt(String(body.partId), 10);
    const quantity = typeof body.quantity === "string" ? body.quantity : String(body.quantity);

    if (!partId || Number.isNaN(partId)) {
      return jsonError("missing_part_id", 400);
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      return jsonError("invalid_quantity", 400);
    }

    const { StockMovementService } = await import("@/services/dur/StockMovementService");
    const issue = await StockMovementService.addIssue(companyId, userId, {
      partId,
      quantity,
      workOrderId: body.workOrderId != null ? parseInt(String(body.workOrderId), 10) : null,
      issuedTo: body.issuedTo != null ? parseInt(String(body.issuedTo), 10) : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return jsonOk(issue);
  },
  { defaultErrorCode: "save_error" },
);
