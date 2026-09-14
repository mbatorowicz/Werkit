import { getAuthSession } from "@/lib/auth";
import { jsonError } from "@/lib/apiRoute";
import { requireLivePrincipalOr401 } from "@/lib/livePrincipal";
import { isSuperadminRole } from "@/lib/tenantRoles";

export async function requireSuperadminSession(): Promise<
  { ok: true; userId: number } | { ok: false; response: Response }
> {
  const session = await getAuthSession();
  const live = await requireLivePrincipalOr401(session);
  if (!live.ok) return live;

  if (!isSuperadminRole(live.principal.role)) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return { ok: true, userId: live.principal.userId };
}
