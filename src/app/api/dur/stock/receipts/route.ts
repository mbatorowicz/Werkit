import { parsePositiveDecimalField, normalizeDecimalBodyField } from "@/lib/decimalInput";
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
    const receipts = await StockMovementService.getReceipts(companyId);
    return jsonOk(receipts);
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

    let unitPrice: string | null = null;
    if (body.unitPrice !== null && body.unitPrice !== undefined && String(body.unitPrice).trim() !== "") {
      unitPrice = normalizeDecimalBodyField(body.unitPrice);
      if (unitPrice == null) {
        return jsonError("invalid_price", 400);
      }
    }

    const { StockMovementService } = await import("@/services/dur/StockMovementService");
    const receipt = await StockMovementService.addReceipt(companyId, userId, {
      partId,
      quantity: qtyParsed.value,
      unitPrice,
      invoiceNumber: typeof body.invoiceNumber === "string" ? body.invoiceNumber : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return jsonOk(receipt);
  },
  { defaultErrorCode: "save_error" }
);
