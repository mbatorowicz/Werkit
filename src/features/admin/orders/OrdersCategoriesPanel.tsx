"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppDictionary } from "@/i18n/types";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { narrowMachinesCategoryRows } from "@/lib/narrowApiListRows";
import { CategoryAdminSection } from "@/features/admin/categories/CategoryAdminSection";
import { ResourceCategoryFormModal } from "@/features/admin/machines/ResourceCategoryFormModal";
import { resourceCategoryToForm } from "@/features/admin/machines/resourceCategoryForm";
import { EMPTY_CATEGORY_FORM, type MachinesCategory } from "@/features/admin/machines/types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  machinesDict: Dict;
  apiErrors: Record<string, string>;
  canMutate: boolean;
};

export function OrdersCategoriesPanel({ machinesDict, apiErrors, canMutate }: Props) {
  const { alert: appAlert } = useAppDialog();
  const [categories, setCategories] = useState<MachinesCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin work-order categories: GET /api/categories",
        "/api/categories",
        { cache: "no-store" },
        { category: "admin" }
      );
      if (!res.ok) {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body) || "fetch_error";
        await appAlert({ message: appDialogApiMessage(apiErrors, code, machinesDict.dbError) });
        setCategories([]);
        return;
      }
      const raw = await parseJsonArray(res);
      setCategories(narrowMachinesCategoryRows(raw));
    } catch {
      await appAlert({ message: machinesDict.dbError });
    } finally {
      setIsLoading(false);
    }
  }, [apiErrors, appAlert, machinesDict.dbError]);

  useEffect(() => {
    queueMicrotask(() => void fetchCategories());
  }, [fetchCategories]);

  return (
    <CategoryAdminSection
      variant="workOrders"
      apiErrors={apiErrors}
      apiErrorFallback={machinesDict.apiError}
      items={categories}
      isLoading={isLoading}
      canMutate={canMutate}
      fetchData={fetchCategories}
      createEmptyForm={() => ({ ...EMPTY_CATEGORY_FORM })}
      itemToForm={resourceCategoryToForm}
      stationaryBadge={machinesDict.badgeStationary}
      renderModal={({
        open,
        onClose,
        isEdit,
        editId,
        form,
        setForm,
        categories: tree,
        onSubmit,
      }) => (
        <ResourceCategoryFormModal
          open={open}
          onClose={onClose}
          isEdit={isEdit}
          dict={machinesDict}
          categories={tree}
          editId={editId}
          form={form}
          setForm={setForm}
          onSubmit={onSubmit}
        />
      )}
    />
  );
}
