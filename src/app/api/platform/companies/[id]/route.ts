import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { isPgUniqueViolation } from "@/lib/pgErrors";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import {
  PlatformCompanyService,
  type CompanyRow,
  type CompanyUpdatePatch,
} from "@/services/PlatformCompanyService";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";
import {
  isCompanyLifecycleStatus,
  isCompanyPlanKey,
  parseInternalNote,
} from "@/lib/companyLifecycle";

export const dynamic = "force-dynamic";

function lifecycleAuditAction(
  before: CompanyRow,
  row: CompanyRow
): "company.archive" | "company.activate" | "company.deactivate" | "company.update" | null {
  if (before.lifecycleStatus === row.lifecycleStatus) return null;
  if (row.lifecycleStatus === "archived") return "company.archive";
  if (!before.isActive && row.isActive) return "company.activate";
  if (before.isActive && !row.isActive) return "company.deactivate";
  return "company.update";
}

async function writeCompanyPatchAudit(
  actorUserId: number,
  id: number,
  patch: CompanyUpdatePatch,
  before: CompanyRow | null,
  row: CompanyRow
): Promise<void> {
  if (before == null) return;

  const nameOrSlugChanged =
    (patch.name !== undefined && before.name !== row.name) ||
    (patch.slug !== undefined && before.slug !== row.slug);
  const noteChanged = patch.internalNote !== undefined && before.internalNote !== row.internalNote;
  const planChanged = patch.planKey !== undefined && before.planKey !== row.planKey;
  const lifecycleAction = lifecycleAuditAction(before, row);

  if (lifecycleAction && lifecycleAction !== "company.update") {
    await PlatformAuditService.insert({
      actorUserId,
      companyId: id,
      action: lifecycleAction,
      targetType: "company",
      targetId: id,
      metadata: {
        from: before.lifecycleStatus,
        to: row.lifecycleStatus,
        isActive: { from: before.isActive, to: row.isActive },
      },
    });
  }

  const shouldWriteUpdate =
    nameOrSlugChanged || noteChanged || planChanged || lifecycleAction === "company.update";
  if (!shouldWriteUpdate) return;

  await PlatformAuditService.insert({
    actorUserId,
    companyId: id,
    action: "company.update",
    targetType: "company",
    targetId: id,
    metadata: {
      from: {
        name: before.name,
        slug: before.slug,
        lifecycleStatus: before.lifecycleStatus,
        planKey: before.planKey,
      },
      to: {
        name: row.name,
        slug: row.slug,
        lifecycleStatus: row.lifecycleStatus,
        planKey: row.planKey,
      },
    },
  });
}

export const PATCH = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireSuperadminSession();
    if (!auth.ok) return auth.response;

    const id = parsePositiveIntFromString((await context.params).id);
    if (id === null) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const patch: CompanyUpdatePatch = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.slug === "string") patch.slug = body.slug;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    if (body.lifecycleStatus !== undefined) {
      if (!isCompanyLifecycleStatus(body.lifecycleStatus)) {
        return jsonError("invalid_payload", 400);
      }
      patch.lifecycleStatus = body.lifecycleStatus;
    }
    if (body.internalNote !== undefined) {
      if (body.internalNote !== null && typeof body.internalNote !== "string") {
        return jsonError("invalid_payload", 400);
      }
      patch.internalNote = parseInternalNote(body.internalNote) ?? null;
    }
    if (body.planKey !== undefined) {
      if (!isCompanyPlanKey(body.planKey)) return jsonError("invalid_payload", 400);
      patch.planKey = body.planKey;
    }

    try {
      const before = await PlatformCompanyService.getCompanyById(id);
      const row = await PlatformCompanyService.updateCompany(id, patch);
      if (!row) return jsonError("not_found", 404);
      await writeCompanyPatchAudit(auth.userId, id, patch, before, row);
      return jsonOk({ success: true, company: row });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "invalid_lifecycle") {
        return jsonError("invalid_payload", 400);
      }
      if (isPgUniqueViolation(e)) return jsonError("slug_exists", 409);
      throw e;
    }
  },
  { defaultErrorCode: "save_error" }
);
