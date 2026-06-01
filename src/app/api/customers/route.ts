import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardCustomerCreate } from "@/lib/guardCustomerMutation";
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  const { companyId } = scoped.data;

  const { DictionaryService } = await import("@/services/DictionaryService");
  const allCustomers = await DictionaryService.getCustomers(companyId);
  return jsonOk(allCustomers);
}, { defaultErrorCode: "fetch_error" });

export const POST = withApiErrorHandling(async (request: Request) => {
  const allowed = await guardCustomerCreate();
  if (!allowed.ok) return allowed.response;
  const { companyId } = allowed;

  const body = await parseJsonBody(request);
  const firstName = typeof body.firstName === "string" ? body.firstName : null;
  const lastName = typeof body.lastName === "string" ? body.lastName : "";
  const defaultAddress = typeof body.defaultAddress === "string" ? body.defaultAddress : null;
  const latitude = body.latitude !== null && body.latitude !== undefined && String(body.latitude).trim() !== "" ? String(body.latitude) : null;
  const longitude = body.longitude !== null && body.longitude !== undefined && String(body.longitude).trim() !== "" ? String(body.longitude) : null;

  if (!lastName.trim()) {
    return jsonError("missing_name", 400);
  }

  const { DictionaryService } = await import("@/services/DictionaryService");
  const customerId = await DictionaryService.addCustomer(
    companyId,
    firstName,
    lastName,
    defaultAddress,
    latitude,
    longitude,
  );
  if (customerId == null) {
    return jsonError("save_error", 500);
  }
  return jsonOk({ customerId });
}, { defaultErrorCode: "save_error" });
