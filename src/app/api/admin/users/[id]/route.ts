import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { hashPassword } from "@/lib/passwordCrypto";
import type { UserUpdatePayload } from "@/services/AdminUserService";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { normalizeAppRole, clampWorkerPermissionsForOrg, workerPermissionsFromBody } from "@/lib/workerUserPermissions";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import { isGpsModuleEnabled } from "@/types/featureFlags";

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
    await AdminUserService.updateUser(companyId, id, updateData);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" }
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
