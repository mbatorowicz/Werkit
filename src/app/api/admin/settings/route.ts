import { jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const GET = withApiErrorHandling(async () => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  const { companyId } = scoped.data;

  const { DictionaryService } = await import("@/services/DictionaryService");
  const data = await DictionaryService.getSettings(companyId);
  return jsonOk(data[0] || {});
}, { defaultErrorCode: "fetch_error" });

export const POST = withApiErrorHandling(async (request: Request) => {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  const { companyId } = scoped.data;

  const body = await parseJsonBody(request);
  const { DictionaryService } = await import("@/services/DictionaryService");

  await DictionaryService.updateSettings(companyId, {
    companyName: typeof body.companyName === "string" ? body.companyName : "Werkit ERP",
    companyAddress: typeof body.companyAddress === "string" ? body.companyAddress : "",
    zipCode: typeof body.zipCode === "string" ? body.zipCode : "",
    city: typeof body.city === "string" ? body.city : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    email: typeof body.email === "string" ? body.email : "",
    baseLatitude:
      body.baseLatitude === null || body.baseLatitude === undefined
        ? null
        : typeof body.baseLatitude === "string" || typeof body.baseLatitude === "number"
          ? String(body.baseLatitude)
          : null,
    baseLongitude:
      body.baseLongitude === null || body.baseLongitude === undefined
        ? null
        : typeof body.baseLongitude === "string" || typeof body.baseLongitude === "number"
          ? String(body.baseLongitude)
          : null,
    cancelWindowMinutes: typeof body.cancelWindowMinutes === "number" ? body.cancelWindowMinutes : 5,
    requirePhotoToFinish: typeof body.requirePhotoToFinish === "boolean" ? body.requirePhotoToFinish : false,
    geofenceRadiusMeters: typeof body.geofenceRadiusMeters === "number" ? body.geofenceRadiusMeters : 500,
    timeOverrunReminder: typeof body.timeOverrunReminder === "boolean" ? body.timeOverrunReminder : true,
    upcomingOrderReminderMinutes:
      typeof body.upcomingOrderReminderMinutes === "number" ? body.upcomingOrderReminderMinutes : 120,
  });

  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });
