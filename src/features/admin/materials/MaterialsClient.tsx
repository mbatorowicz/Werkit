"use client";

import { useEffect, useRef } from "react";
import { HardHat } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { MaterialsCatalogPanel } from "@/features/admin/materials/MaterialsCatalogPanel";
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

  const { materials, categories, isLoading, fetchData } = useMaterialsAdminData(alertCtxRef);

  useEffect(() => {
    alertCtxRef.current = { apiErrors, listFetchFallback: machDict.dbError };
  }, [apiErrors, machDict.dbError]);

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
      </div>

      <MaterialsCatalogPanel
        dict={dict}
        machDict={machDict}
        apiErrors={apiErrors}
        categories={categories}
        materials={materials}
        isLoading={isLoading}
        canMutate={canMutate}
        fetchData={fetchData}
      />
    </>
  );
}
