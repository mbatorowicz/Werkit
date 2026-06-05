/** Zawężacze dla panelu admina – użytkownicy, klienci, elementy Gantta. */

import type { UnifiedGanttItem } from "@/types/admin";
import type { UserOrgProfile } from "@/types/organization";
import { narrowUserOrgProfile } from "./organization";
import { isRecord, narrowStringArray } from "./shared";

/** Wiersz listy użytkowników (`/api/admin/users`) w panelu admin. */
export type AdminUserListRow = {
  id: number;
  fullName: string;
  phone: string | null;
  usernameEmail: string;
  role: string;
  isActive: boolean;
  canCreateOwnOrders: boolean;
  canEditRoute: boolean;
  canCreateCustomers: boolean;
  isDurWorker: boolean;
  orgProfile?: UserOrgProfile;
};

export function narrowAdminUserRows(rows: unknown[]): AdminUserListRow[] {
  const out: AdminUserListRow[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (
      typeof r.id !== "number" ||
      typeof r.fullName !== "string" ||
      typeof r.usernameEmail !== "string" ||
      typeof r.role !== "string"
    ) {
      continue;
    }
    const phone = r.phone === null || typeof r.phone === "string" ? (r.phone as string | null) : null;
    const orgProfile = r.orgProfile !== undefined ? narrowUserOrgProfile(r.orgProfile) : undefined;
    out.push({
      id: r.id,
      fullName: r.fullName,
      phone,
      usernameEmail: r.usernameEmail,
      role: r.role,
      isActive: typeof r.isActive === "boolean" ? r.isActive : true,
      canCreateOwnOrders: typeof r.canCreateOwnOrders === "boolean" ? r.canCreateOwnOrders : true,
      canEditRoute: typeof r.canEditRoute === "boolean" ? r.canEditRoute : false,
      canCreateCustomers: typeof r.canCreateCustomers === "boolean" ? r.canCreateCustomers : false,
      isDurWorker: typeof r.isDurWorker === "boolean" ? r.isDurWorker : false,
      ...(orgProfile ? { orgProfile } : {}),
    });
  }
  return out;
}

/** Wiersz klientów z `/api/customers` (panel admin). */
export type AdminCustomerListRow = {
  id: number;
  firstName: string | null;
  lastName: string;
  phone: string | null;
  defaultAddress: string | null;
  latitude: string | null;
  longitude: string | null;
  locationAddresses?: string[];
};

export function narrowAdminCustomerRows(rows: unknown[]): AdminCustomerListRow[] {
  const out: AdminCustomerListRow[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.lastName !== "string") continue;
    const firstName =
      r.firstName === null || typeof r.firstName === "string"
        ? (r.firstName as string | null)
        : null;
    const phone = r.phone === null || typeof r.phone === "string" ? (r.phone as string | null) : null;
    const defaultAddress =
      r.defaultAddress === null || typeof r.defaultAddress === "string"
        ? (r.defaultAddress as string | null)
        : null;
    const latitude =
      r.latitude === null || typeof r.latitude === "string" ? (r.latitude as string | null) : null;
    const longitude =
      r.longitude === null || typeof r.longitude === "string"
        ? (r.longitude as string | null)
        : null;
    const locationAddresses = narrowStringArray(r.locationAddresses);
    out.push({
      id: r.id,
      firstName,
      lastName: r.lastName,
      phone,
      defaultAddress,
      latitude,
      longitude,
      ...(locationAddresses.length > 0 ? { locationAddresses } : {}),
    });
  }
  return out;
}

/** Minimalna walidacja wiersza listy dyspozycji — reszta pól z API (kontrakt serwera). */
export function narrowUnifiedGanttItems(rows: unknown[]): UnifiedGanttItem[] {
  const out: UnifiedGanttItem[] = [];
  for (const row of rows) {
    if (!isRecord(row) || typeof row.id !== "number") continue;
    out.push(row as UnifiedGanttItem);
  }
  return out;
}
