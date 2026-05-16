import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import {
  isMissingResourceCategoriesStationaryColumn,
  isMissingResourceCategoriesVisibilityColumns,
} from '@/lib/postgresMigrationHints';
import { CategoryHierarchyError } from '@/services/categoryHierarchyValidation';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

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
    mapUnknownError: (err) => (isMissingResourceCategoriesStationaryColumn(err) ? jsonError("migration_required", 503) : null),
    defaultErrorCode: "fetch_error",
  },
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
    const showCustomer = body.showCustomer;
    const showMaterial = body.showMaterial;
    const showQuantity = body.showQuantity;
    const showTaskDescription = body.showTaskDescription;
    const reqCustomer = body.reqCustomer;
    const reqMaterial = body.reqMaterial;
    const reqQuantity = body.reqQuantity;
    const reqTaskDescription = body.reqTaskDescription;
    const isGlobal = body.isGlobal;
    const isStationary = body.isStationary;
    const color = typeof body.color === "string" ? body.color : null;
    const showResourceName = body.showResourceName;
    const showResourceDescription = body.showResourceDescription;
    const showRegistrationNumber = body.showRegistrationNumber;

    if (!name) {
      return jsonError("missing_name", 400);
    }

    const { DictionaryService } = await import("@/services/DictionaryService");
    const { parseHierarchyFields } = await import("@/services/categoryHierarchyValidation");
    const hierarchy = parseHierarchyFields(body as Record<string, unknown>);
    const sc = showCustomer !== undefined ? !!showCustomer : true;
    const sm = showMaterial !== undefined ? !!showMaterial : true;
    const sq = showQuantity !== undefined ? !!showQuantity : true;
    const std = showTaskDescription !== undefined ? !!showTaskDescription : true;
    const rc = !!reqCustomer;
    const rm = !!reqMaterial;
    const rq = !!reqQuantity;
    const rtd = reqTaskDescription !== undefined ? !!reqTaskDescription : true;
    const srn = showResourceName !== undefined ? !!showResourceName : true;
    const srd = showResourceDescription !== undefined ? !!showResourceDescription : false;
    const sreg = showRegistrationNumber !== undefined ? !!showRegistrationNumber : true;
    await DictionaryService.addCategory(companyId, {
      name: name.trim(),
      parentId: hierarchy.parentId,
      isGroup: hierarchy.isGroup,
      sortOrder: hierarchy.sortOrder,
      icon: icon || "Truck",
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
      isGlobal: !!isGlobal,
      isStationary: !!isStationary,
      color: color || "#3f3f46",
    });
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof CategoryHierarchyError) return jsonError(err.code, 400);
      if (isMissingResourceCategoriesVisibilityColumns(err) || isMissingResourceCategoriesStationaryColumn(err)) {
        return jsonError("migration_required", 503);
      }
      return null;
    },
    defaultErrorCode: "category_exists",
  },
);
