import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { hashPassword } from '@/lib/passwordCrypto';
import type { UserUpdatePayload } from '@/services/AdminUserService';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const PUT = withApiErrorHandling(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  const { companyId } = scoped.data;

  const params = await context.params;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id < 1) return jsonError("invalid_id", 400);

  const body = await parseJsonBody(request);
  const normalizedRole = body.role === "admin" ? "admin" : body.role === "viewer" ? "viewer" : "worker";

  const updateData: UserUpdatePayload = {
    fullName: typeof body.fullName === "string" ? body.fullName : "",
    usernameEmail: typeof body.usernameEmail === "string" ? body.usernameEmail : "",
    role: normalizedRole,
  };

  if (normalizedRole === "worker" && body.canCreateOwnOrders !== undefined) {
    updateData.canCreateOwnOrders = !!body.canCreateOwnOrders;
  } else {
    updateData.canCreateOwnOrders = false;
  }

  if (normalizedRole === "worker" && body.canEditRoute !== undefined) {
    updateData.canEditRoute = !!body.canEditRoute;
  } else {
    updateData.canEditRoute = false;
  }

  if (typeof body.password === "string" && body.password.trim() !== "") {
    updateData.passwordHash = await hashPassword(body.password, 10);
  }

  const { AdminUserService } = await import("@/services/AdminUserService");
  await AdminUserService.updateUser(companyId, id, updateData);
  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });

export const DELETE = withApiErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
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
}, { defaultErrorCode: "delete_error" });
