import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { isPgUniqueViolation } from "@/lib/pgErrors";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import { PlatformCompanyService, type CompanyRow } from "@/services/PlatformCompanyService";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";

export const dynamic = "force-dynamic";

type CompanyPatch = { name?: string; slug?: string; isActive?: boolean };

async function writeCompanyPatchAudit(
  actorUserId: number,
  id: number,
  patch: CompanyPatch,
  before: CompanyRow | null,
  row: CompanyRow
): Promise<void> {
  const nameOrSlugChanged =
    (patch.name !== undefined && before != null && before.name !== row.name) ||
    (patch.slug !== undefined && before != null && before.slug !== row.slug);
  if (nameOrSlugChanged) {
    await PlatformAuditService.insert({
      actorUserId,
      companyId: id,
      action: "company.update",
      targetType: "company",
      targetId: id,
      metadata: {
        from: { name: before?.name, slug: before?.slug },
        to: { name: row.name, slug: row.slug },
      },
    });
  }
  if (before != null && patch.isActive !== undefined && before.isActive !== row.isActive) {
    await PlatformAuditService.insert({
      actorUserId,
      companyId: id,
      action: row.isActive ? "company.activate" : "company.deactivate",
      targetType: "company",
      targetId: id,
      metadata: { from: before.isActive, to: row.isActive },
    });
  }
}

export const PATCH = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const id = parsePositiveIntFromString((await context.params).id);
    if (id === null) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const patch: CompanyPatch = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.slug === "string") patch.slug = body.slug;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;

    try {
      const before = await PlatformCompanyService.getCompanyById(id);
      const row = await PlatformCompanyService.updateCompany(id, patch);
      if (!row) return jsonError("not_found", 404);
      await writeCompanyPatchAudit(auth.userId, id, patch, before, row);
      return jsonOk({ success: true, company: row });
    } catch (e: unknown) {
      if (isPgUniqueViolation(e)) return jsonError("slug_exists", 409);
      throw e;
    }
  },
  { defaultErrorCode: "save_error" }
);
