import type { UserUpdatePayload } from "@/services/AdminUserService";

export type WorkerPermissionFlags = {
  canCreateOwnOrders: boolean;
  canEditRoute: boolean;
  canCreateCustomers: boolean;
  isDurWorker: boolean;
};

export const WORKER_PERMISSION_DEFAULTS: WorkerPermissionFlags = {
  canCreateOwnOrders: true,
  canEditRoute: false,
  canCreateCustomers: false,
  isDurWorker: false,
};

export const NON_WORKER_PERMISSION_FLAGS: WorkerPermissionFlags = {
  canCreateOwnOrders: false,
  canEditRoute: false,
  canCreateCustomers: false,
  isDurWorker: false,
};

type Role = "worker" | "admin" | "viewer";

export function normalizeAppRole(role: unknown): Role {
  if (role === "admin") return "admin";
  if (role === "viewer") return "viewer";
  return "worker";
}

export function workerPermissionsFromBody(
  role: Role,
  body: Record<string, unknown>
): WorkerPermissionFlags {
  if (role !== "worker") return NON_WORKER_PERMISSION_FLAGS;
  return {
    canCreateOwnOrders: !!body.canCreateOwnOrders,
    canEditRoute: !!body.canEditRoute,
    canCreateCustomers: !!body.canCreateCustomers,
    isDurWorker: !!body.isDurWorker,
  };
}

export function applyWorkerPermissionsToUpdate(
  updateData: UserUpdatePayload,
  role: Role,
  body: Record<string, unknown>
): void {
  const flags = workerPermissionsFromBody(role, body);
  updateData.canCreateOwnOrders = flags.canCreateOwnOrders;
  updateData.canEditRoute = flags.canEditRoute;
  updateData.canCreateCustomers = flags.canCreateCustomers;
  updateData.isDurWorker = flags.isDurWorker;
}

export function clampWorkerPermissionsForOrg(
  permissions: WorkerPermissionFlags,
  orgModules: { gpsModuleEnabled: boolean; durEnabled: boolean }
): WorkerPermissionFlags {
  return {
    ...permissions,
    canEditRoute: orgModules.gpsModuleEnabled ? permissions.canEditRoute : false,
    isDurWorker: orgModules.durEnabled ? permissions.isDurWorker : false,
  };
}

export function pickWorkerUserFlags(row: {
  id: number;
  canCreateOwnOrders: boolean;
  notificationsEnabled: boolean;
  canEditRoute: boolean;
  canCreateCustomers: boolean;
  isDurWorker: boolean;
}) {
  return {
    id: row.id,
    canCreateOwnOrders: row.canCreateOwnOrders,
    notificationsEnabled: row.notificationsEnabled,
    canEditRoute: row.canEditRoute,
    canCreateCustomers: row.canCreateCustomers,
    isDurWorker: row.isDurWorker,
  };
}
