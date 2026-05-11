import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { hashPassword } from '@/lib/passwordCrypto';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const { AdminUserService } = await import("@/services/AdminUserService");
  const allUsers = await AdminUserService.getAllUsers();
  return jsonOk(allUsers);
}, { defaultErrorCode: "fetch_error" });

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const body = await parseJsonBody(request);
    const fullName = typeof body.fullName === "string" ? body.fullName : "";
    const usernameEmail = typeof body.usernameEmail === "string" ? body.usernameEmail : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role;
    const canCreateOwnOrders = body.canCreateOwnOrders;

    if (!fullName || !usernameEmail || !password) {
      return jsonError("missing_fields", 400);
    }

    const normalizedRole = role === "admin" ? "admin" : role === "viewer" ? "viewer" : "worker";

    const { AdminUserService } = await import("@/services/AdminUserService");
    const hashedPassword = await hashPassword(password, 10);

    await AdminUserService.createUser({
      fullName,
      usernameEmail,
      passwordHash: hashedPassword,
      role: normalizedRole,
      canCreateOwnOrders: normalizedRole === "worker" ? !!canCreateOwnOrders : false,
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
