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
 * Do odczytu używamy getDownloadUrl() który generuje tymczasowy URL.
 * Signed URL są generowane w serwisach (WorkerSessionService, AdminSessionService)
 * przy każdym zapytaniu o dane sesji.
 */

import { put, del, list, getDownloadUrl } from '@vercel/blob';

const BLOB_PREFIX = 'werkit-photos';

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

