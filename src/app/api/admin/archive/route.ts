import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

import { JWT_SECRET } from '@/lib/auth';
import { AdminOrderService } from '@/services/AdminOrderService';

export const GET = withApiErrorHandling(async () => {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return jsonError("Unauthorized", 401);
  await jwtVerify(token, JWT_SECRET);

  const data = await AdminOrderService.getArchivedSessions();
  return jsonOk(data);
}, { defaultErrorCode: "fetch_error" });
