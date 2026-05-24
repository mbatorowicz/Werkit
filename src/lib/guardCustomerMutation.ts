import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

type GuardOk = {
  ok: true;
  companyId: number;
  userId: number;
};

type GuardFail = {
  ok: false;
  response: Response;
};

/** Admin zawsze; worker tylko z `can_create_customers` w profilu. */
export async function guardCustomerCreate(): Promise<GuardOk | GuardFail> {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return { ok: false, response: scoped.response };

  const session = await getAuthSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.role === "admin") {
    return { ok: true, companyId: scoped.data.companyId, userId: session.userId };
  }

  if (session.role === "worker") {
    const { AdminUserService } = await import("@/services/AdminUserService");
    const user = await AdminUserService.getUserByIdForCompany(session.userId, scoped.data.companyId);
    if (user?.canCreateCustomers) {
      return { ok: true, companyId: scoped.data.companyId, userId: session.userId };
    }
  }

  return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}
