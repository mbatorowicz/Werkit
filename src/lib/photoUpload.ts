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
 * UWAGA: Store jest skonfigurowany jako prywatny — zdjęcia są dostępne przez Signed URL.
 * Do odczytu używamy head() który zwraca świeży, ważny downloadUrl.
 * Odświeżanie URL-i odbywa się przez refreshBlobUrl() — stosowane w serwisach
 * (WorkerSessionService, AdminSessionService) przy każdym zapytaniu o dane sesji.
 */

import { put, del, list, head } from '@vercel/blob';

const BLOB_PREFIX = 'werkit-photos';

/**
 * Prywatny store Vercel Blob zwraca signed URL, które wygasają.
 * Trzymamy prosty cache in-memory z TTL, żeby nie robić head() na każde żądanie.
 * Cache jest resetowany przy restarcie serwera (Next.js dev/prod) — to bezpieczne.
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minuty (signed URL żyją zazwyczaj 30-60 min)

/**
 * Zwraca świeży, ważny URL do zdjęcia z Vercel Blob (private store).
 * Używa head() do pobrania aktualnego downloadUrl.
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
  if (!photoUrl.includes('.private.blob.vercel-storage.com')) {
    return photoUrl;
  }

  try {
    const meta = await head(photoUrl);
    const freshUrl = meta.downloadUrl;

    // Zapisz w cache
    signedUrlCache.set(photoUrl, {
      url: freshUrl,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return freshUrl;
  } catch {
    // Jeśli head() się nie powiedzie (np. network error), zwróć oryginalny URL
    // Może być nieaktualny, ale to lepsze niż nic
    return photoUrl;
  }
}

/**
 * Odświeża tablicę URL-i zdjęć — batch processing z równoległymi wywołaniami.
 */
export async function refreshBlobUrls(urls: (string | null | undefined)[]): Promise<(string | null)[]> {
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
): Promise<PhotoUploadResult> {
  // Konwersja data URL na Blob (kompatybilne z Edge + Node.js)
  const matches = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches || !matches[2]) {
    throw new Error('invalid_photo_data');
  }

  const mimeType = matches[1];
  const ext = mimeType.split('/')[1] || 'jpg';

  // Dekoduj base64 do Blob — nie używa Buffer, działa w Edge Runtime
  const binaryStr = atob(matches[2]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const fileBlob = new Blob([bytes], { type: mimeType });

  const filename = `${BLOB_PREFIX}/${sessionId}/${Date.now()}_${photoType.toLowerCase()}.${ext}`;

  const result = await put(filename, fileBlob, {
    contentType: mimeType,
    access: 'private',
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
): Promise<PhotoUploadResult> {
  const ext = file.type.split('/')[1] || 'jpg';
  const filename = `${BLOB_PREFIX}/${sessionId}/${Date.now()}_${photoType.toLowerCase()}.${ext}`;

  const blob = await put(filename, file, {
    contentType: file.type,
    access: 'private',
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
export async function deleteSessionPhotos(sessionId: number): Promise<void> {
  try {
    const prefix = `${BLOB_PREFIX}/${sessionId}/`;
    const { blobs } = await list({ prefix });
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url));
    }
  } catch {
    // Ignoruj błędy
  }
}

