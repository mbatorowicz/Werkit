import { NextResponse } from "next/server";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { DelegationScopeService } from "@/services/DelegationScopeService";

/** Pełny admin lub lider/kierownik z prawem delegowania zleceń — rola z DB. */
export async function guardDispatchMutation(): Promise<
  NextResponse | Response | { ok: true; companyId: number; userId: number; role: string }
> {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { companyId, session } = scoped.data;
  const role = session.role;
  const userId = session.userId;

  if (role === "admin") {
    return { ok: true, companyId, userId, role };
  }

  if (role !== "viewer" && role !== "worker") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasRights = await DelegationScopeService.hasDelegationRights(companyId, userId);
  if (!hasRights) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { ok: true, companyId, userId, role };
}
