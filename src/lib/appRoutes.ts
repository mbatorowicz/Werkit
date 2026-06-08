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
  /** @deprecated Użyj `people` — przekierowanie zachowane dla starych linków. */
  users: "/admin/users",
  /** Ludzie, konta i struktura organizacyjna (SSOT UI). */
  people: "/admin/organization",
  machines: "/admin/machines",
  materials: "/admin/materials",
  customers: "/admin/customers",
  reports: "/admin/reports",
  settings: "/admin/settings",
  logs: "/admin/logs",
  help: "/admin/help",
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
  /** @deprecated Użyj `dispatchArchive` — zwraca wyłącznie zakończone sesje. */
  archive: "/api/admin/archive",
  dispatch: {
    live: "/api/admin/dispatch/live",
    archive: "/api/admin/dispatch/archive",
    dictionaries: "/api/admin/dispatch/dictionaries",
  },
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
    tree: "/api/admin/organization/tree",
  },
} as const;

export const materialsApi = {
  inventory: "/api/materials/inventory",
  stockReceipts: "/api/materials/stock/receipts",
  stockIssues: "/api/materials/stock/issues",
} as const;

export const workerRoutes = {
  home: "/worker",
  help: "/worker/help",
  wizard: "/worker/wizard",
  history: "/worker/history",
  profile: "/worker/profile",
} as const;

export const workerApi = {
  spareParts: (workOrderId: number) => `/api/worker/work-orders/${workOrderId}/spare-parts`,
  delegationTargets: "/api/worker/delegation-targets",
  delegations: "/api/worker/delegations",
} as const;

export function adminDispatchOpenUrl(workOrderOrSessionId: number): string {
  return `${adminRoutes.dispatch}?open=${workOrderOrSessionId}`;
}

export const platformRoutes = {
  home: "/platform",
  help: "/platform/help",
} as const;
