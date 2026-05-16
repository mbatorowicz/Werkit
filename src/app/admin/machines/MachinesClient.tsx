"use client";

import { useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { MachinesClientCategoryPanel } from "@/features/admin/machines/MachinesClientCategoryPanel";
import {
  MachinesClientMachineFormPanel,
  type MachinesClientMachineFormHandle,
} from "@/features/admin/machines/MachinesClientMachineFormPanel";
import { MachinesClientResourcesTablePanel } from "@/features/admin/machines/MachinesClientResourcesTablePanel";
import { useMachinesAdminData } from "@/features/admin/machines/useMachinesAdminData";

export default function MachinesClient() {
  const { canMutate } = useAdminAbility();
  const { machines, categories, isLoading, fetchData } = useMachinesAdminData();
  const machineFormRef = useRef<MachinesClientMachineFormHandle | null>(null);

  const dictionary = getDictionary();
  const dict = dictionary.admin.machines;
  const nav = dictionary.admin.sidebar;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

  return (
    <>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Wrench className="h-6 w-6 text-emerald-500" />
          {nav.resources}
        </h1>
      </div>

      <MachinesClientCategoryPanel
        dict={dict}
        apiErrors={apiErrors}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        fetchData={fetchData}
      />

      <MachinesClientResourcesTablePanel
        dict={dict}
        apiErrors={apiErrors}
        machines={machines}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        fetchData={fetchData}
        onAddResource={() => machineFormRef.current?.openNew()}
        onEditResource={(m) => machineFormRef.current?.openEdit(m)}
      />

      <MachinesClientMachineFormPanel ref={machineFormRef} dict={dict} apiErrors={apiErrors} categories={categories} fetchData={fetchData} />
    </>
  );
}
