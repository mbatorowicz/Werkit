import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export const PUT = withApiErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  const params = await context.params;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

  const body = await parseJsonBody(request);
  const lastName = typeof body.lastName === "string" ? body.lastName : "";
  if (!lastName.trim()) return jsonError("missing_name", 400);

  const { DictionaryService } = await import("@/services/DictionaryService");
  await DictionaryService.updateCustomer(id, {
    firstName: typeof body.firstName === "string" ? body.firstName : null,
    lastName,
    defaultAddress: typeof body.defaultAddress === "string" ? body.defaultAddress : null,
    latitude: body.latitude != null && String(body.latitude).trim() !== "" ? String(body.latitude) : null,
    longitude: body.longitude != null && String(body.longitude).trim() !== "" ? String(body.longitude) : null,
  });
  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });

export const DELETE = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.deleteCustomer(id);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "customer_in_use" },
);
