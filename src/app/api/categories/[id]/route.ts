import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import type { ResourceCategoryUpdateInput } from "@/services/DictionaryService";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import {
  isMissingResourceCategoriesStationaryColumn,
  isMissingResourceCategoriesVisibilityColumns,
} from "@/lib/postgresMigrationHints";

export const PUT = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const nameRaw = typeof body.name === "string" ? body.name : "";
    if (!nameRaw.trim()) return jsonError("missing_name", 400);

    const { DictionaryService } = await import("@/services/DictionaryService");
    const updateData: ResourceCategoryUpdateInput = {
      name: nameRaw.trim(),
      icon: typeof body.icon === "string" ? body.icon : "Truck",
    };
    if (body.showCustomer !== undefined) updateData.showCustomer = !!body.showCustomer;
    if (body.showMaterial !== undefined) updateData.showMaterial = !!body.showMaterial;
    if (body.showQuantity !== undefined) updateData.showQuantity = !!body.showQuantity;
    if (body.showTaskDescription !== undefined) updateData.showTaskDescription = !!body.showTaskDescription;
    if (body.reqCustomer !== undefined) updateData.reqCustomer = !!body.reqCustomer;
    if (body.reqMaterial !== undefined) updateData.reqMaterial = !!body.reqMaterial;
    if (body.reqQuantity !== undefined) updateData.reqQuantity = !!body.reqQuantity;
    if (body.reqTaskDescription !== undefined) updateData.reqTaskDescription = !!body.reqTaskDescription;
    if (body.isGlobal !== undefined) updateData.isGlobal = !!body.isGlobal;
    if (body.isStationary !== undefined) updateData.isStationary = !!body.isStationary;
    if (body.color !== undefined) updateData.color = body.color as string;
    if (body.showResourceName !== undefined) updateData.showResourceName = !!body.showResourceName;
    if (body.showResourceDescription !== undefined) updateData.showResourceDescription = !!body.showResourceDescription;
    if (body.showRegistrationNumber !== undefined) updateData.showRegistrationNumber = !!body.showRegistrationNumber;

    if (updateData.reqCustomer) updateData.showCustomer = true;
    if (updateData.reqMaterial) updateData.showMaterial = true;
    if (updateData.reqQuantity) updateData.showQuantity = true;
    if (updateData.reqTaskDescription) updateData.showTaskDescription = true;

    await DictionaryService.updateCategory(id, updateData);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) =>
      isMissingResourceCategoriesStationaryColumn(err) || isMissingResourceCategoriesVisibilityColumns(err)
        ? jsonError("migration_required", 503)
        : null,
    defaultErrorCode: "category_in_use",
  },
);

export const DELETE = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return jsonError("invalid_id", 400);

    const { DictionaryService } = await import("@/services/DictionaryService");
    await DictionaryService.deleteCategory(id);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "category_has_machines" },
);
