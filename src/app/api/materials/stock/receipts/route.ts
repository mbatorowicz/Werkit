import { normalizeDecimalBodyField, parsePositiveDecimalField } from "@/lib/decimalInput";
import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { MaterialStockMovementError } from "@/services/materials/MaterialStockMovementError";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { MaterialStockMovementService } =
      await import("@/services/materials/MaterialStockMovementService");
    const receipts = await MaterialStockMovementService.getReceipts(scoped.data.companyId);
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

    const body = await parseJsonBody(request);
    const materialId = parseInt(String(body.materialId), 10);
    if (!materialId || Number.isNaN(materialId)) return jsonError("invalid_id", 400);

    const qtyParsed = parsePositiveDecimalField(body.quantity);
    if (!qtyParsed.ok) return jsonError("invalid_quantity", 400);

    let unitPrice: string | null = null;
    if (body.unitPrice != null && String(body.unitPrice).trim() !== "") {
      unitPrice = normalizeDecimalBodyField(body.unitPrice);
      if (unitPrice == null) return jsonError("invalid_price", 400);
    }

    try {
      const { MaterialStockMovementService } =
        await import("@/services/materials/MaterialStockMovementService");
      const receipt = await MaterialStockMovementService.addReceipt(companyId, userId, {
        materialId,
        quantity: qtyParsed.value,
        unitPrice,
        invoiceNumber:
          typeof body.invoiceNumber === "string" ? body.invoiceNumber.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes : null,
      });
      return jsonOk(receipt);
    } catch (err) {
      if (err instanceof MaterialStockMovementError) {
        return jsonError(err.code, 400);
      }
      throw err;
    }
  },
  { defaultErrorCode: "save_error" }
);
