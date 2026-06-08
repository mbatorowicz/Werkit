/**
 * Interwał cichego odświeżania (bez WebSocketów na Vercel): zlecenia / sesja pracownika,
 * pulpity dyspozycji admina. Komponenty same wstrzymują timer przy `document.hidden`.
 */
export const UI_BACKGROUND_SYNC_INTERVAL_MS = 12_000;

/** Słowniki dyspozycji (kategorie, maszyny, …) — rzadsze odświeżanie niż dane live. */
export const UI_DICTIONARY_SYNC_INTERVAL_MS = 90_000;
