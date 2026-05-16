import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from '@/lib/apiTenant';

export const POST = withApiErrorHandling(async (request: Request) => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const body = await parseJsonBody(request);
  const { AdminUserService } = await import("@/services/AdminUserService");

  const actor = await AdminUserService.getUserById(ctx.userId);
  if (!actor || actor.companyId !== ctx.companyId) return jsonError("Unauthorized", 401);

  if (body.notificationsEnabled !== undefined) {
    const v = body.notificationsEnabled;
    if (typeof v !== "boolean") {
      return jsonError("invalid_payload", 400);
    }
    await AdminUserService.updateUser(ctx.companyId, ctx.userId, { notificationsEnabled: v });
  }

  if (body.biometricLoginEnabled !== undefined) {
    const want = body.biometricLoginEnabled;
    if (typeof want !== "boolean") {
      return jsonError("invalid_payload", 400);
    }
    if (want) {
      if (actor.role !== "worker") {
        return jsonError("biometric_workers_only", 403);
      }
      const pwd = typeof body.password === "string" ? body.password : "";
      if (!pwd.trim()) {
        return jsonError("biometric_password_required", 400);
      }
      const ok = await AdminUserService.verifyPasswordForUserId(ctx.userId, pwd);
      if (!ok) {
        return jsonError("invalid_credentials", 401);
      }
      await AdminUserService.updateUser(ctx.companyId, ctx.userId, { biometricLoginEnabled: true });
    } else {
      await AdminUserService.updateUser(ctx.companyId, ctx.userId, { biometricLoginEnabled: false });
    }
  }

  return jsonOk({ success: true });
}, { defaultErrorCode: "save_error" });
