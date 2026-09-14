import { PlatformCompanyService, type CompanyRow } from "@/services/PlatformCompanyService";
import {
  PlatformTenantUserService,
  type PlatformTenantUserRole,
} from "@/services/PlatformTenantUserService";

export class PlatformImpersonationError extends Error {
  constructor(message: "not_found" | "company_inactive" | "user_inactive") {
    super(message);
    this.name = "PlatformImpersonationError";
  }
}

export type ImpersonationStartTarget = {
  company: CompanyRow;
  target: { id: number; role: PlatformTenantUserRole; fullName: string };
};

/** Walidacja celu impersonacji — tylko admin/viewer, aktywna firma i konto. */
export class PlatformImpersonationService {
  static async resolveStartTarget(
    companyId: number,
    targetUserId: number
  ): Promise<ImpersonationStartTarget> {
    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company) throw new PlatformImpersonationError("not_found");
    if (!company.isActive) throw new PlatformImpersonationError("company_inactive");

    const target = await PlatformTenantUserService.getStaffUser(companyId, targetUserId);
    if (!target) throw new PlatformImpersonationError("not_found");
    if (!target.isActive) throw new PlatformImpersonationError("user_inactive");

    return {
      company,
      target: { id: target.id, role: target.role, fullName: target.fullName },
    };
  }
}
