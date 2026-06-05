import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { hashPassword } from "@/lib/passwordCrypto";
import type { UserUpdatePayload } from "@/services/AdminUserService";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import {
  normalizeAppRole,
  clampWorkerPermissionsForOrg,
  workerPermissionsFromBody,
} from "@/lib/workerUserPermissions";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import { isGpsModuleEnabled } from "@/types/featureFlags";
import { DelegationScopeService } from "@/services/DelegationScopeService";

export const dynamic = "force-dynamic";

/** GET /api/admin/users/[id] — użytkownik z profilem organizacyjnym. */
export const GET = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

    const { AdminUserService } = await import("@/services/AdminUserService");
    const user = await AdminUserService.getUserByIdForCompany(id, companyId);
    if (!user) return jsonError("not_found", 404);

    const orgProfile = await DelegationScopeService.getUserOrgProfile(companyId, id);
    return jsonOk({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      usernameEmail: user.usernameEmail,
      role: user.role,
      isActive: user.isActive,
      canCreateOwnOrders: user.canCreateOwnOrders,
      canEditRoute: user.canEditRoute,
      canCreateCustomers: user.canCreateCustomers,
      isDurWorker: user.isDurWorker,
      reportsToId: user.reportsToId,
      orgProfile,
    });
  },
  { defaultErrorCode: "fetch_error" }
);

export const PUT = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const normalizedRole = normalizeAppRole(body.role);

    const phone =
      typeof body.phone === "string" && body.phone.trim() !== "" ? body.phone.trim() : null;

    const updateData: UserUpdatePayload = {
      fullName: typeof body.fullName === "string" ? body.fullName : "",
      phone,
      usernameEmail: typeof body.usernameEmail === "string" ? body.usernameEmail : "",
      role: normalizedRole,
    };

    const featureFlags = await PlatformFeatureFlagService.getFlags(companyId);
    const flags = clampWorkerPermissionsForOrg(workerPermissionsFromBody(normalizedRole, body), {
      gpsModuleEnabled: isGpsModuleEnabled(featureFlags),
      durEnabled: featureFlags.durEnabled,
    });
    updateData.canCreateOwnOrders = flags.canCreateOwnOrders;
    updateData.canEditRoute = flags.canEditRoute;
    updateData.canCreateCustomers = flags.canCreateCustomers;
    updateData.isDurWorker = flags.isDurWorker;

    if (typeof body.password === "string" && body.password.trim() !== "") {
      updateData.passwordHash = await hashPassword(body.password, 10);
    }

    const { AdminUserService } = await import("@/services/AdminUserService");
    if (normalizedRole === "worker") {
      updateData.reportsToId = await AdminUserService.resolveReportsToId(
        companyId,
        id,
        body.reportsToId
      );
    } else {
      updateData.reportsToId = null;
    }

    await AdminUserService.updateUser(companyId, id, updateData);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) =>
      err instanceof Error && err.message === "invalid_supervisor"
        ? jsonError("invalid_supervisor", 400)
        : null,
    defaultErrorCode: "save_error",
  }
);

export const DELETE = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

    const { AdminUserService } = await import("@/services/AdminUserService");
    await AdminUserService.deleteUser(companyId, id);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "delete_error" }
);
