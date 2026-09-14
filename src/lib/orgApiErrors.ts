import { jsonError } from "@/lib/apiRoute";

const ORG_DOMAIN_CODES = new Set([
  "invalid_parent",
  "invalid_team",
  "invalid_user",
  "invalid_payload",
]);

/** Błędy asercji tenanta w module organizacji → 400, bez `cross_tenant`. */
export function mapOrgDomainError(err: unknown) {
  if (err instanceof Error && ORG_DOMAIN_CODES.has(err.message)) {
    return jsonError(err.message, 400);
  }
  return null;
}
