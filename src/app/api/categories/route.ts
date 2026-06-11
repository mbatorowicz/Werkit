import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import {
  isMissingResourceCategoriesStationaryColumn,
  isMissingResourceCategoriesVisibilityColumns,
} from "@/lib/postgresMigrationHints";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColorStyles";
import { narrowOrderType } from "@/lib/orderType";
import { CategoryHierarchyError } from "@/services/categoryHierarchyValidation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

function resolveCategoryCreateFlags(body: Record<string, unknown>) {
  const sc = body.showCustomer !== undefined ? !!body.showCustomer : true;
  const sm = body.showMaterial !== undefined ? !!body.showMaterial : true;
  const sq = body.showQuantity !== undefined ? !!body.showQuantity : true;
  const std = body.showTaskDescription !== undefined ? !!body.showTaskDescription : true;
  const rc = !!body.reqCustomer;
  const rm = !!body.reqMaterial;
  const rq = !!body.reqQuantity;
  const rtd = body.reqTaskDescription !== undefined ? !!body.reqTaskDescription : true;
  const srn = body.showResourceName !== undefined ? !!body.showResourceName : true;
  const srd = body.showResourceDescription !== undefined ? !!body.showResourceDescription : false;
  const sreg = body.showRegistrationNumber !== undefined ? !!body.showRegistrationNumber : true;

  return {
    showCustomer: sc || rc,
    showMaterial: sm || rm,
    showQuantity: sq || rq,
    showTaskDescription: std || rtd,
    showResourceName: srn,
    showResourceDescription: srd,
    showRegistrationNumber: sreg,
    reqCustomer: rc,
    reqMaterial: rm,
    reqQuantity: rq,
    reqTaskDescription: rtd,
  };
}

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const leavesOnly = new URL(request.url).searchParams.get("leavesOnly") === "1";
    const { DictionaryService } = await import("@/services/DictionaryService");
    const allCategories = await DictionaryService.getCategories(companyId, { leavesOnly });
    return jsonOk(allCategories);
  },
  {
    mapUnknownError: (err) =>
      isMissingResourceCategoriesStationaryColumn(err)
        ? jsonError("migration_required", 503)
        : null,
    defaultErrorCode: "fetch_error",
  }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const body = await parseJsonBody(request);
    const name = typeof body.name === "string" ? body.name : "";
    const icon = typeof body.icon === "string" ? body.icon : null;
    const isGlobal = body.isGlobal;
    const isStationary = body.isStationary;
    const color = typeof body.color === "string" ? body.color : null;
    const orderType = narrowOrderType(body.orderType);

    if (!name) {
      return jsonError("missing_name", 400);
    }

    const { DictionaryService } = await import("@/services/DictionaryService");
    const { parseHierarchyFields } = await import("@/services/categoryHierarchyValidation");
    const hierarchy = parseHierarchyFields(body as Record<string, unknown>);
    await DictionaryService.addCategory(companyId, {
      name: name.trim(),
      parentId: hierarchy.parentId,
      isGroup: hierarchy.isGroup,
      sortOrder: hierarchy.sortOrder,
      icon: icon || "Truck",
      ...resolveCategoryCreateFlags(body),
      isGlobal: !!isGlobal,
      isStationary: !!isStationary,
      color: color || DEFAULT_CATEGORY_COLOR,
      orderType,
    });
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof CategoryHierarchyError) return jsonError(err.code, 400);
      if (
        isMissingResourceCategoriesVisibilityColumns(err) ||
        isMissingResourceCategoriesStationaryColumn(err)
      ) {
        return jsonError("migration_required", 503);
      }
      return null;
    },
    defaultErrorCode: "category_exists",
  }
);
