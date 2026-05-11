"use client";

import { useEffect, useRef } from "react";
import { HardHat } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { MaterialsClientCategoriesPanel } from "@/features/admin/materials/MaterialsClientCategoriesPanel";
import { MaterialsClientMaterialsTablePanel } from "@/features/admin/materials/MaterialsClientMaterialsTablePanel";
import {
  useMaterialsAdminData,
  type MaterialsAdminAlertContext,
} from "@/features/admin/materials/useMaterialsAdminData";

export default function MaterialsClient() {
  const { canMutate } = useAdminAbility();

  const dictionary = getDictionary();
  const dict = dictionary.admin.materials;
  const nav = dictionary.admin.sidebar;
  const machDict = dictionary.admin.machines;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const alertCtxRef = useRef<MaterialsAdminAlertContext>({
    apiErrors,
    listFetchFallback: machDict.dbError,
  });
  alertCtxRef.current = { apiErrors, listFetchFallback: machDict.dbError };

  const { materials, categories, isLoading, fetchData } = useMaterialsAdminData(alertCtxRef);

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

  return (
    <>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <HardHat className="h-6 w-6 text-emerald-500" />
          {nav.materials}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dict.pageSubtitle}</p>
      </div>

      <MaterialsClientCategoriesPanel
        dict={dict}
        machDict={machDict}
        apiErrors={apiErrors}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        fetchData={fetchData}
      />

      <MaterialsClientMaterialsTablePanel
        dict={dict}
        machDict={machDict}
        apiErrors={apiErrors}
        materials={materials}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        fetchData={fetchData}
      />
    </>
  );
}
