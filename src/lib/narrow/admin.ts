/** Zawężacze dla panelu admina – użytkownicy, klienci, elementy Gantta. */

import type { UnifiedGanttItem } from "@/types/admin";
import { isRecord, narrowStringArray } from "./shared";

/** Wiersz listy użytkowników (`/api/admin/users`) w panelu admin. */
export type AdminUserListRow = {
  id: number;
  fullName: string;
  usernameEmail: string;
  role: string;
  isActive: boolean;
  canCreateOwnOrders: boolean;
  canEditRoute: boolean;
  canCreateCustomers: boolean;
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
    out.push({
      id: r.id,
      fullName: r.fullName,
      usernameEmail: r.usernameEmail,
      role: r.role,
      isActive: typeof r.isActive === "boolean" ? r.isActive : true,
      canCreateOwnOrders: typeof r.canCreateOwnOrders === "boolean" ? r.canCreateOwnOrders : true,
      canEditRoute: typeof r.canEditRoute === "boolean" ? r.canEditRoute : false,
      canCreateCustomers: typeof r.canCreateCustomers === "boolean" ? r.canCreateCustomers : false,
    });
  }
  return out;
}

/** Wiersz klientów z `/api/customers` (panel admin). */
export type AdminCustomerListRow = {
  id: number;
  firstName: string | null;
  lastName: string;
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
    const firstName = r.firstName === null || typeof r.firstName === "string" ? (r.firstName as string | null) : null;
    const defaultAddress =
      r.defaultAddress === null || typeof r.defaultAddress === "string" ? (r.defaultAddress as string | null) : null;
    const latitude = r.latitude === null || typeof r.latitude === "string" ? (r.latitude as string | null) : null;
    const longitude = r.longitude === null || typeof r.longitude === "string" ? (r.longitude as string | null) : null;
    const locationAddresses = narrowStringArray(r.locationAddresses);
    out.push({
      id: r.id,
      firstName,
      lastName: r.lastName,
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
