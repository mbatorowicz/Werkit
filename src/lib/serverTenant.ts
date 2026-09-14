import { requireLiveCompanyPrincipalOrRedirect } from "@/lib/livePrincipal";

/** Kontekst firmy dla Server Components (admin / worker) — żywy principal z DB. */
export async function requireServerCompanyId(): Promise<number> {
  const principal = await requireLiveCompanyPrincipalOrRedirect();
  return principal.companyId;
}
