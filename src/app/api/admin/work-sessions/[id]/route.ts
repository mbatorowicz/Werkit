import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { cookies } from 'next/headers';
import { JWT_SECRET, getUserId } from '@/lib/auth';
import { jwtVerify } from 'jose';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { AdminSessionService } from '@/services/AdminSessionService';
import { AdminUserService } from '@/services/AdminUserService';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return jsonError("Unauthorized", 401);
  await jwtVerify(token, JWT_SECRET);

  const sessionId = parseInt((await context.params).id, 10);
  if (Number.isNaN(sessionId)) return jsonError("invalid_id", 400);

  const { logs, photos, notes } = await AdminSessionService.getSessionDetails(sessionId);
  return jsonOk({ logs, photos, notes });
}, { defaultErrorCode: "fetch_error" });

export const DELETE = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const sessionId = parseInt((await context.params).id, 10);
    if (Number.isNaN(sessionId)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const password = typeof body.password === "string" ? body.password : "";
    if (!password.trim()) return jsonError("admin_password_required", 400);

    const userId = await getUserId();
    if (!userId) return jsonError("Unauthorized", 401);

    const passwordOk = await AdminUserService.verifyPasswordForUserId(userId, password);
    if (!passwordOk) return jsonError("invalid_credentials", 401);

    await AdminSessionService.deleteArchivedSession(sessionId);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "not_found") return jsonError("not_found", 404);
      if (msg === "session_still_active") return jsonError("session_still_active", 409);
      return null;
    },
    defaultErrorCode: "delete_error",
  },
);
