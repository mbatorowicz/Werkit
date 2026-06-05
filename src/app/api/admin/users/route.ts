import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { hashPassword } from "@/lib/passwordCrypto";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { normalizeAppRole, workerPermissionsFromBody, clampWorkerPermissionsForOrg } from "@/lib/workerUserPermissions";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import { isGpsModuleEnabled } from "@/types/featureFlags";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const { AdminUserService } = await import("@/services/AdminUserService");
    const { DelegationScopeService } = await import("@/services/DelegationScopeService");
    const [allUsers, orgProfiles] = await Promise.all([
      AdminUserService.getAllUsers(companyId),
      DelegationScopeService.getOrgProfilesForCompany(companyId),
    ]);
    const enriched = allUsers.map((u) => ({
      ...u,
      orgProfile: orgProfiles.get(u.id) ?? {
        deptManagerOf: [],
        teamLeaderOf: [],
        teamMemberships: [],
        supervisorChain: [],
        directSupervisor: null,
      },
    }));
    return jsonOk(enriched);
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const body = await parseJsonBody(request);
    const fullName = typeof body.fullName === "string" ? body.fullName : "";
    const usernameEmail = typeof body.usernameEmail === "string" ? body.usernameEmail : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role;
    const normalizedRole = normalizeAppRole(role);
    const featureFlags = await PlatformFeatureFlagService.getFlags(companyId);
    const permissions = clampWorkerPermissionsForOrg(
      workerPermissionsFromBody(normalizedRole, body),
      { gpsModuleEnabled: isGpsModuleEnabled(featureFlags), durEnabled: featureFlags.durEnabled }
    );

    if (!fullName || !usernameEmail || !password) {
      return jsonError("missing_fields", 400);
    }

    const { AdminUserService } = await import("@/services/AdminUserService");
    const hashedPassword = await hashPassword(password, 10);

    const phone =
      typeof body.phone === "string" && body.phone.trim() !== "" ? body.phone.trim() : null;

    let reportsToId: number | null = null;
    if (normalizedRole === "worker") {
      reportsToId = await AdminUserService.resolveReportsToId(companyId, null, body.reportsToId);
    }

    await AdminUserService.createUser(companyId, {
      fullName,
      phone,
      usernameEmail,
      passwordHash: hashedPassword,
      role: normalizedRole,
      ...permissions,
      reportsToId,
    });

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof Error && err.message === "invalid_supervisor") {
        return jsonError("invalid_supervisor", 400);
      }
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: unknown }).code === "23505"
      ) {
        return jsonError("user_exists", 500);
      }
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
