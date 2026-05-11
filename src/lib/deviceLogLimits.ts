/** Liczba wierszy z `device_logs` na stronie `/admin/logs` (SSR). */
export const DEVICE_LOGS_PAGE_LIMIT = 500;

/** Maks. wierszy w `GET /api/admin/logs/export` (ochrona rozmiaru odpowiedzi). */
export const DEVICE_LOGS_EXPORT_MAX = 10_000;
