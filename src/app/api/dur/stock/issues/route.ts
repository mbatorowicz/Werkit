import { parsePositiveDecimalField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { requireDurFeature } from "@/lib/requireDurFeature";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const { StockMovementService } = await import("@/services/dur/StockMovementService");
    const issues = await StockMovementService.getIssues(companyId);
    return jsonOk(issues);
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId, session } = scoped.data;
    const userId = session.userId;

    const dur = await requireDurFeature(companyId);
    if (!dur.ok) return dur.response;

    const body = await parseJsonBody(request);
    const partId =
      typeof body.partId === "number" ? body.partId : parseInt(String(body.partId), 10);
    const qtyParsed = parsePositiveDecimalField(body.quantity);

    if (!partId || Number.isNaN(partId)) {
      return jsonError("missing_part_id", 400);
    }
    if (!qtyParsed.ok) {
      return jsonError("invalid_quantity", 400);
    }

    const { StockMovementService } = await import("@/services/dur/StockMovementService");
    const { StockMovementError } = await import("@/services/dur/StockMovementError");
    try {
      const issue = await StockMovementService.addIssue(companyId, userId, {
        partId,
        quantity: qtyParsed.value,
        workOrderId:
          body.workOrderId !== null && body.workOrderId !== undefined
            ? parseInt(String(body.workOrderId), 10)
            : null,
        issuedTo:
          body.issuedTo !== null && body.issuedTo !== undefined
            ? parseInt(String(body.issuedTo), 10)
            : null,
        notes: typeof body.notes === "string" ? body.notes : null,
      });
      return jsonOk(issue);
    } catch (err) {
      if (err instanceof StockMovementError) {
        return jsonError(err.code, 400);
      }
      throw err;
    }
  },
  { defaultErrorCode: "save_error" }
);
