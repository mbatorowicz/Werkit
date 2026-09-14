import type { JwtPayload } from "@/lib/auth";
import { isCompanyScopedRole, isSuperadminRole } from "@/lib/tenantRoles";
import { AdminUserService } from "@/services/AdminUserService";
import { PlatformCompanyService } from "@/services/PlatformCompanyService";

/** Konto z DB — rola i firma nie pochodzą z JWT. */
export type LivePrincipal = {
  userId: number;
  role: string;
  companyId: number | null;
  fullName: string;
  /** Obecne tylko w sesji wsparcia (JWT `impersonatorUserId`). */
  impersonatorUserId?: number;
};

export type LiveCompanyPrincipal = LivePrincipal & { companyId: number };

/**
 * Rewalidacja sesji w Node (nie na Edge): user + firma muszą być żywe.
 * Rola i `companyId` zawsze z DB — demotion i przeniesienie między firmami działają od razu.
 */
export class AuthPrincipalService {
  static async resolve(session: JwtPayload): Promise<LivePrincipal | null> {
    const userId = session.userId;
    if (!Number.isInteger(userId) || userId < 1) return null;

    if (session.impersonatorUserId != null) {
      return this.resolveImpersonation(session);
    }

    const user = await AdminUserService.getUserById(userId);
    if (!user?.isActive) return null;

    if (isSuperadminRole(user.role)) {
      return {
        userId: user.id,
        role: user.role,
        companyId: null,
        fullName: user.fullName,
      };
    }

    if (!isCompanyScopedRole(user.role)) return null;

    const companyId = user.companyId;
    if (companyId == null || companyId < 1) return null;

    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company?.isActive) return null;

    return {
      userId: user.id,
      role: user.role,
      companyId,
      fullName: user.fullName,
    };
  }

  /**
   * Impersonacja = principal **celu** (admin/viewer firmy).
   * Aktora (superadmin) weryfikujemy z DB — nie ufamy claimowi `role`.
   */
  private static async resolveImpersonation(session: JwtPayload): Promise<LivePrincipal | null> {
    const actorId = session.impersonatorUserId;
    if (actorId == null || !Number.isInteger(actorId) || actorId < 1) return null;
    if (actorId === session.userId) return null;

    const actor = await AdminUserService.getUserById(actorId);
    if (!actor?.isActive || !isSuperadminRole(actor.role)) return null;

    const target = await AdminUserService.getUserById(session.userId);
    if (!target?.isActive) return null;
    if (target.role !== "admin" && target.role !== "viewer") return null;

    const companyId = target.companyId;
    if (companyId == null || companyId < 1) return null;
    if (session.companyId !== companyId) return null;

    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company?.isActive) return null;

    return {
      userId: target.id,
      role: target.role,
      companyId,
      fullName: target.fullName,
      impersonatorUserId: actor.id,
    };
  }
}

export function isLiveCompanyPrincipal(
  principal: LivePrincipal
): principal is LiveCompanyPrincipal {
  return principal.companyId != null && principal.companyId >= 1;
}
