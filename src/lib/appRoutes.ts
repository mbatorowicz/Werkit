/**
 * Kanoniczne ścieżki UI i admin API — SSOT dla linków w kodzie.
 *
 * Konwencja:
 * - Panel admin: `/admin/{moduł}`
 * - Dyspozycja (Gantt): `/admin` (+ opcjonalnie `?open=`)
 * - Admin API: `/api/admin/{zasób}`
 * - Worker API: `/api/worker/{zasób}`
 * - Słowniki współdzielone: `/api/{zasób}` (machines, customers, …)
 */

export const adminRoutes = {
  dispatch: "/admin",
  users: "/admin/users",
  machines: "/admin/machines",
  materials: "/admin/materials",
  customers: "/admin/customers",
  reports: "/admin/reports",
  settings: "/admin/settings",
  logs: "/admin/logs",
} as const;

export const adminApi = {
  users: "/api/admin/users",
  user: (id: number) => `/api/admin/users/${id}`,
  settings: "/api/admin/settings",
  workOrders: "/api/admin/work-orders",
  archive: "/api/admin/archive",
} as const;

export function adminDispatchOpenUrl(workOrderOrSessionId: number): string {
  return `${adminRoutes.dispatch}?open=${workOrderOrSessionId}`;
}
