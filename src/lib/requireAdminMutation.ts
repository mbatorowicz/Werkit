import { NextResponse } from "next/server";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

/** Wyłącznie rola `admin` z DB może mutować dane (nie dotyczy konta `viewer`). */
export async function guardAdminMutation(): Promise<NextResponse | Response | undefined> {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  if (scoped.data.session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return undefined;
}
