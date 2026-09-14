import { db } from "@/db";
import { users } from "@/db/schema";
import { and, count, desc, eq, inArray } from "drizzle-orm";

export type PlatformTenantUserRole = "admin" | "viewer";

export type PlatformTenantUserRow = {
  id: number;
  fullName: string;
  usernameEmail: string;
  role: PlatformTenantUserRole;
  isActive: boolean;
  lastLoginAt: string | null;
};

const TENANT_STAFF_ROLES: PlatformTenantUserRole[] = ["admin", "viewer"];

function isTenantStaffRole(role: string): role is PlatformTenantUserRole {
  return role === "admin" || role === "viewer";
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** SSOT: nie gasimy ostatniego aktywnego admina firmy. */
export function tenantUserDeactivationBlockedReason(params: {
  targetRole: string;
  currentlyActive: boolean;
  nextIsActive: boolean;
  activeAdminCount: number;
}): "last_admin" | null {
  if (
    params.targetRole === "admin" &&
    params.currentlyActive &&
    !params.nextIsActive &&
    params.activeAdminCount <= 1
  ) {
    return "last_admin";
  }
  return null;
}

export class PlatformTenantUserService {
  static async listCompanyUsers(
    companyId: number,
    options?: { roles?: PlatformTenantUserRole[] }
  ): Promise<PlatformTenantUserRow[]> {
    const roles = options?.roles?.length ? options.roles : TENANT_STAFF_ROLES;
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        usernameEmail: users.usernameEmail,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(and(eq(users.companyId, companyId), inArray(users.role, roles)))
      .orderBy(desc(users.id));

    const out: PlatformTenantUserRow[] = [];
    for (const row of rows) {
      if (!isTenantStaffRole(row.role)) continue;
      out.push({
        id: row.id,
        fullName: row.fullName,
        usernameEmail: row.usernameEmail,
        role: row.role,
        isActive: row.isActive,
        lastLoginAt: toIsoOrNull(row.lastLoginAt),
      });
    }
    return out;
  }

  static async getStaffUser(companyId: number, userId: number) {
    const [row] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        usernameEmail: users.usernameEmail,
        role: users.role,
        isActive: users.isActive,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.companyId, companyId)))
      .limit(1);
    if (!row || !isTenantStaffRole(row.role)) return null;
    return { ...row, role: row.role };
  }

  static async countActiveAdmins(companyId: number): Promise<number> {
    const [row] = await db
      .select({ n: count() })
      .from(users)
      .where(
        and(eq(users.companyId, companyId), eq(users.role, "admin"), eq(users.isActive, true))
      );
    return Number(row?.n ?? 0);
  }

  static async setUserActive(
    companyId: number,
    userId: number,
    isActive: boolean,
    _actorId: number
  ): Promise<{ id: number; role: PlatformTenantUserRole; isActive: boolean }> {
    const target = await this.getStaffUser(companyId, userId);
    if (!target) throw new Error("not_found");

    if (target.isActive === isActive) {
      return { id: target.id, role: target.role, isActive: target.isActive };
    }

    const activeAdminCount = target.role === "admin" ? await this.countActiveAdmins(companyId) : 0;
    const blocked = tenantUserDeactivationBlockedReason({
      targetRole: target.role,
      currentlyActive: target.isActive,
      nextIsActive: isActive,
      activeAdminCount,
    });
    if (blocked) throw new Error(blocked);

    await db
      .update(users)
      .set({ isActive })
      .where(and(eq(users.id, userId), eq(users.companyId, companyId)));

    return { id: target.id, role: target.role, isActive };
  }

  static async resetPassword(
    companyId: number,
    userId: number,
    passwordHash: string,
    _actorId: number
  ): Promise<void> {
    const target = await this.getStaffUser(companyId, userId);
    if (!target) throw new Error("not_found");

    await db
      .update(users)
      .set({ passwordHash })
      .where(and(eq(users.id, userId), eq(users.companyId, companyId)));
  }
}
