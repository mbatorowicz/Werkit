import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/dur/spare-part-compatibility/[id]?partId=X&categoryId=Y
 * Używamy query params, bo to złożony klucz (partId, categoryId).
 */
export const DELETE = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const url = new URL(request.url);
    const partId = parseInt(url.searchParams.get("partId") ?? "", 10);
    const categoryId = parseInt(url.searchParams.get("categoryId") ?? "", 10);

    if (Number.isNaN(partId) || Number.isNaN(categoryId)) {
      return jsonError("missing_params", 400);
    }

    const { SparePartCompatibilityService } =
      await import("@/services/dur/SparePartCompatibilityService");
    await SparePartCompatibilityService.remove(partId, categoryId);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "delete_error" }
);
