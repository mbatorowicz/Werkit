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
}

export function isLiveCompanyPrincipal(
  principal: LivePrincipal
): principal is LiveCompanyPrincipal {
  return principal.companyId != null && principal.companyId >= 1;
}
