import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { WorkerSessionService } from "@/services/WorkerSessionService";

/**
 * POST /api/worker/session/photos
 *
 * Przesyła zdjęcie z sesji pracownika.
 * Zdjęcie jest przesyłane jako data URL (base64), serwer zapisuje je w Vercel Blob Storage,
 * a w bazie danych przechowuje tylko URL do pliku.
 *
 * Body: { photoUrl: string (data URL), location?: { lat: number, lng: number } }
 */
export const POST = withApiErrorHandling(async (req: Request) => {
  const sessionResult = await requireWorkerCompanySession();
  if (!sessionResult.ok) {
    return sessionResult.response;
  }
  const { userId, companyId } = sessionResult;

  const body = await parseJsonBody(req);
  const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl : "";
  const rawLoc = body.location;
  const location =
    rawLoc && typeof rawLoc === "object" && "lat" in rawLoc && "lng" in rawLoc
      ? (rawLoc as { lat: number; lng: number })
      : undefined;

  if (!photoUrl) {
    return jsonError("missing_photo", 400);
  }

  try {
    const result = await WorkerSessionService.uploadAndAddPhoto(
      userId,
      companyId,
      photoUrl,
      location,
    );
    return jsonOk({ success: true, url: result.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "no_active_session") {
      return jsonError("no_active_session", 400);
    }
    console.error("[photoUpload]", message, err instanceof Error ? err.stack : "");
    return jsonError("photo_upload_failed", 500);
  }
});
