import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { DelegationScopeService } from "@/services/DelegationScopeService";

/** Pełny admin lub lider/kierownik z prawem delegowania zleceń. */
export async function guardDispatchMutation(): Promise<
  NextResponse | Response | { ok: true; companyId: number; userId: number; role: string }
> {
  const session = await getAuthSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "admin") {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    return {
      ok: true,
      companyId: scoped.data.companyId,
      userId: session.userId,
      role: session.role,
    };
  }

  if (session.role !== "viewer" && session.role !== "worker") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const hasRights = await DelegationScopeService.hasDelegationRights(
    scoped.data.companyId,
    session.userId
  );
  if (!hasRights) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    ok: true,
    companyId: scoped.data.companyId,
    userId: session.userId,
    role: session.role,
  };
}
