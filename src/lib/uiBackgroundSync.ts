/**
 * Interwał cichego odświeżania (bez WebSocketów na Vercel): zlecenia / sesja pracownika,
 * pulpity dyspozycji admina. Komponenty same wstrzymują timer przy `document.hidden`.
 */
export const UI_BACKGROUND_SYNC_INTERVAL_MS = 12_000;
