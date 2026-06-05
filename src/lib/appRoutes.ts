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
  organization: "/admin/organization",
  dur: {
    /** Katalog części + przyjęcia/wydania (jedna strona). */
    warehouse: "/admin/dur/warehouse",
  },
} as const;

export const adminApi = {
  users: "/api/admin/users",
  usersDelegatable: "/api/admin/users/delegatable",
  user: (id: number) => `/api/admin/users/${id}`,
  settings: "/api/admin/settings",
  workOrders: "/api/admin/work-orders",
  workOrder: (id: number) => `/api/admin/work-orders/${id}`,
  archive: "/api/admin/archive",
  spareParts: (workOrderId: number) => `/api/admin/work-orders/${workOrderId}/spare-parts`,
  sparePart: (workOrderId: number, partId: number) =>
    `/api/admin/work-orders/${workOrderId}/spare-parts/${partId}`,
  organization: {
    departments: "/api/admin/organization/departments",
    department: (id: number) => `/api/admin/organization/departments/${id}`,
    teams: "/api/admin/organization/teams",
    team: (id: number) => `/api/admin/organization/teams/${id}`,
    teamMembers: "/api/admin/organization/team-members",
    teamMember: (id: number) => `/api/admin/organization/team-members/${id}`,
  },
} as const;

export const workerApi = {
  spareParts: (workOrderId: number) => `/api/worker/work-orders/${workOrderId}/spare-parts`,
  delegationTargets: "/api/worker/delegation-targets",
  delegations: "/api/worker/delegations",
} as const;

export function adminDispatchOpenUrl(workOrderOrSessionId: number): string {
  return `${adminRoutes.dispatch}?open=${workOrderOrSessionId}`;
}
