import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { hashPassword } from '@/lib/passwordCrypto';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  const { companyId } = scoped.data;

  const { AdminUserService } = await import("@/services/AdminUserService");
  const allUsers = await AdminUserService.getAllUsers(companyId);
  return jsonOk(allUsers);
}, { defaultErrorCode: "fetch_error" });

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
    const canCreateOwnOrders = body.canCreateOwnOrders;
    const canEditRoute = body.canEditRoute;

    if (!fullName || !usernameEmail || !password) {
      return jsonError("missing_fields", 400);
    }

    const normalizedRole = role === "admin" ? "admin" : role === "viewer" ? "viewer" : "worker";

    const { AdminUserService } = await import("@/services/AdminUserService");
    const hashedPassword = await hashPassword(password, 10);

    await AdminUserService.createUser(companyId, {
      fullName,
      usernameEmail,
      passwordHash: hashedPassword,
      role: normalizedRole,
      canCreateOwnOrders: normalizedRole === "worker" ? !!canCreateOwnOrders : false,
      canEditRoute: normalizedRole === "worker" ? !!canEditRoute : false,
    });

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) =>
      typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "23505"
        ? jsonError("user_exists", 500)
        : null,
    defaultErrorCode: "save_error",
  },
);
