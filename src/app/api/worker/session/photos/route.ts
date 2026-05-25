import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { uploadPhotoBase64 } from "@/lib/photoUpload";
import { db } from "@/db";
import { sessionPhotos, workSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

  // Znajdź aktywną sesję
  const [session] = await db
    .select({ id: workSessions.id })
    .from(workSessions)
    .where(
      and(
        eq(workSessions.userId, userId),
        eq(workSessions.companyId, companyId),
        eq(workSessions.status, "IN_PROGRESS"),
      ),
    )
    .limit(1);

  if (!session) {
    return jsonError("no_active_session", 400);
  }

  // Prześlij do Vercel Blob Storage
  let blobUrl: string;
  try {
    const result = await uploadPhotoBase64(photoUrl, session.id, "AD_HOC");
    blobUrl = result.url;
  } catch {
    return jsonError("photo_upload_failed", 500);
  }

  // Zapisz URL w bazie (zamiast data URL)
  await db.insert(sessionPhotos).values({
    workSessionId: session.id,
    photoUrl: blobUrl,
    photoType: "AD_HOC",
    latitude: location?.lat != null ? String(location.lat) : null,
    longitude: location?.lng != null ? String(location.lng) : null,
  });

  return jsonOk({ success: true, url: blobUrl });
});
