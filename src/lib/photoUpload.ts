/**
 * Obsługa przesyłania zdjęć do Vercel Blob Storage.
 *
 * Konfiguracja:
 * 1. Dodaj `BLOB_READ_WRITE_TOKEN` do `.env.local` (token z Vercel Dashboard → Storage → Blob)
 * 2. Opcjonalnie: `NEXT_PUBLIC_BLOB_URL_PREFIX` dla niestandardowego domeny (np. media.werkit.app)
 *
 * Zastępuje starą metodę zapisu data URL w bazie danych.
 * Zdjęcia są przechowywane w Blob Storage, a w DB zapisujemy tylko URL.
 *
 * UWAGA: Store jest skonfigurowany jako prywatny — zdjęcia wymagają signed URL.
 * Do odczytu w przeglądarce generujemy krótkotrwały presigned URL (issueSignedToken + presignUrl).
 * Odświeżanie URL-i odbywa się przez refreshBlobUrl() — stosowane w serwisach
 * (WorkerSessionService, AdminSessionService) przy każdym zapytaniu o dane sesji.
 */

import { put, del, list, issueSignedToken, presignUrl } from "@vercel/blob";
import {
  assertValidatedPhotoBytes,
  parseAndValidatePhotoDataUrl,
} from "@/lib/photoPayloadLimits";
import { sessionPhotoBlobKey, sessionPhotoBlobPrefixes } from "@/lib/photoBlobPaths";

/**
 * Prywatny store Vercel Blob zwraca signed URL, które wygasają.
 * Trzymamy prosty cache in-memory z TTL, żeby nie robić head() na każde żądanie.
 * Cache jest resetowany przy restarcie serwera (Next.js dev/prod) — to bezpieczne.
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minuty (presigned URL ważny 30 min)
const PRESIGNED_URL_TTL_MS = 30 * 60 * 1000;

/**
 * Zwraca świeży, ważny presigned URL do zdjęcia z Vercel Blob (private store).
 * Wynik jest cache'owany w pamięci przez CACHE_TTL_MS.
 *
 * @param photoUrl - URL zapisany w bazie (zwrócony przez put())
 * @returns Ważny signed URL do wyświetlenia zdjęcia
 */
export async function refreshBlobUrl(photoUrl: string | null | undefined): Promise<string | null> {
  if (!photoUrl) return null;

  // Sprawdź cache
  const cached = signedUrlCache.get(photoUrl);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  // Dla URL-i spoza Vercel Blob private store zwracamy oryginał
  if (!photoUrl.includes(".private.blob.vercel-storage.com")) {
    return photoUrl;
  }

  try {
    const pathname = new URL(photoUrl).pathname.slice(1);
    const validUntil = Date.now() + PRESIGNED_URL_TTL_MS;
    const token = await issueSignedToken({
      pathname,
      validUntil,
      operations: ["get"],
    });
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname,
      access: "private",
      validUntil,
    });

    signedUrlCache.set(photoUrl, {
      url: presignedUrl,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return presignedUrl;
  } catch {
    // Presign nie powiódł się — oryginalny URL i tak zwróci 403, ale unikamy crasha API
    return photoUrl;
  }
}

/**
 * Odświeża tablicę URL-i zdjęć — batch processing z równoległymi wywołaniami.
 */
export async function refreshBlobUrls(
  urls: (string | null | undefined)[]
): Promise<(string | null)[]> {
  return Promise.all(urls.map((u) => refreshBlobUrl(u)));
}

export type PhotoUploadResult = {
  url: string;
};

/**
 * Przesyła zdjęcie (base64 data URL) do Vercel Blob Storage.
 * Zwraca URL zdjęcia (Signed URL dla store'a prywatnego).
 */
export async function uploadPhotoBase64(
  base64DataUrl: string,
  sessionId: number,
  photoType: string,
  companyId: number
): Promise<PhotoUploadResult> {
  const { mimeType, bytes, ext } = parseAndValidatePhotoDataUrl(base64DataUrl);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const fileBlob = new Blob([copy], { type: mimeType });

  const filename = sessionPhotoBlobKey(companyId, sessionId, photoType, ext);

  const result = await put(filename, fileBlob, {
    contentType: mimeType,
    access: "private",
    addRandomSuffix: true,
  });

  return {
    url: result.url,
  };
}

/**
 * Przesyła plik (File/Blob) bezpośrednio do Vercel Blob Storage.
 * Używane gdy klient wysyła FormData z plikiem.
 */
export async function uploadPhotoFile(
  file: File | Blob,
  sessionId: number,
  photoType: string,
  companyId: number
): Promise<PhotoUploadResult> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const { mimeType, ext } = assertValidatedPhotoBytes(file.type || "", buffer);
  const filename = sessionPhotoBlobKey(companyId, sessionId, photoType, ext);

  const blob = await put(filename, file, {
    contentType: mimeType,
    access: "private",
    addRandomSuffix: true,
  });

  return {
    url: blob.url,
  };
}

/**
 * Usuwa zdjęcie z Blob Storage.
 */
export async function deletePhoto(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Ignoruj błędy usuwania — plik mógł już nie istnieć
  }
}

/**
 * Usuwa wszystkie zdjęcia dla danej sesji.
 */
export async function deleteSessionPhotos(sessionId: number, companyId?: number): Promise<void> {
  try {
    const prefixes = sessionPhotoBlobPrefixes(sessionId, companyId);
    for (const prefix of prefixes) {
      const { blobs } = await list({ prefix });
      if (blobs.length > 0) {
        await del(blobs.map((b) => b.url));
      }
    }
  } catch {
    // Ignoruj błędy
  }
}

/**
 * Odświeża tablicę obiektów zdjęć — generuje świeże signed URL dla każdego `photoUrl`.
 * Używane w AdminSessionService i WorkerSessionService przy pobieraniu szczegółów sesji.
 */
export async function refreshPhotoUrls<T extends { photoUrl: string }>(photos: T[]): Promise<T[]> {
  return Promise.all(
    photos.map(async (p) => ({
      ...p,
      photoUrl: (await refreshBlobUrl(p.photoUrl)) ?? p.photoUrl,
    }))
  );
}
