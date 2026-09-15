/** Throttle INSERT `device_logs` — 30 / min / user (S2). */
export const MAX_DEVICE_LOGS_PER_MINUTE = 30;

/** Liczba wierszy z `device_logs` na stronie `/admin/logs` (SSR). */
export const DEVICE_LOGS_PAGE_LIMIT = 500;

/** Maks. wierszy w `GET /api/admin/logs/export` (ochrona rozmiaru odpowiedzi). */
export const DEVICE_LOGS_EXPORT_MAX = 10_000;

/** Maks. wywołań `GET /api/admin/logs/export` / 15 min / firmę (S4). */
export const MAX_DEVICE_LOGS_EXPORT_PER_WINDOW = 5;
