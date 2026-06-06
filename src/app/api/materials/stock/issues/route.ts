import { parsePositiveDecimalField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { MaterialStockMovementError } from "@/services/materials/MaterialStockMovementError";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { MaterialStockMovementService } = await import(
      "@/services/materials/MaterialStockMovementService"
    );
    const issues = await MaterialStockMovementService.getIssues(scoped.data.companyId);
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

    const body = await parseJsonBody(request);
    const materialId = parseInt(String(body.materialId), 10);
    if (!materialId || Number.isNaN(materialId)) return jsonError("invalid_id", 400);

    const qtyParsed = parsePositiveDecimalField(body.quantity);
    if (!qtyParsed.ok) return jsonError("invalid_quantity", 400);

    const workOrderId =
      body.workOrderId != null && String(body.workOrderId).trim() !== ""
        ? parseInt(String(body.workOrderId), 10)
        : null;
    const issuedTo =
      body.issuedTo != null && String(body.issuedTo).trim() !== ""
        ? parseInt(String(body.issuedTo), 10)
        : null;

    try {
      const { MaterialStockMovementService } = await import(
        "@/services/materials/MaterialStockMovementService"
      );
      const issue = await MaterialStockMovementService.addIssue(companyId, userId, {
        materialId,
        quantity: qtyParsed.value,
        workOrderId: workOrderId && !Number.isNaN(workOrderId) ? workOrderId : null,
        issuedTo: issuedTo && !Number.isNaN(issuedTo) ? issuedTo : null,
        notes: typeof body.notes === "string" ? body.notes : null,
      });
      return jsonOk(issue);
    } catch (err) {
      if (err instanceof MaterialStockMovementError) {
        return jsonError(err.code, 400);
      }
      throw err;
    }
  },
  { defaultErrorCode: "save_error" }
);
