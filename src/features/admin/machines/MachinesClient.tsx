"use client";

import { useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { useDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminCollapsibleSection } from "@/components/Admin/AdminCollapsibleSection";
import {
  MachinesClientMachineFormPanel,
  type MachinesClientMachineFormHandle,
} from "@/features/admin/machines/MachinesClientMachineFormPanel";
import { MachinesClientResourcesTablePanel } from "@/features/admin/machines/MachinesClientResourcesTablePanel";
import { useMachinesAdminData } from "@/features/admin/machines/useMachinesAdminData";
import DurResourceGroupsClient from "@/features/admin/dur/DurResourceGroupsClient";
import { useResourceGroups } from "@/features/admin/dur/useResourceGroups";

export default function MachinesClient() {
  const { canMutate, durEnabled } = useAdminAbility();
  const { machines, categories, isLoading, fetchData } = useMachinesAdminData();
  const { groups: resourceGroups, fetchGroups } = useResourceGroups();
  const machineFormRef = useRef<MachinesClientMachineFormHandle | null>(null);

  const dictionary = useDictionary();
  const dict = dictionary.admin.machines;
  const nav = dictionary.admin.sidebar;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
      if (durEnabled) void fetchGroups();
    });
  }, [fetchData, fetchGroups, durEnabled]);

  return (
    <>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Wrench className="h-6 w-6 text-emerald-500" />
          {nav.resources}
        </h1>
      </div>

      {durEnabled ? (
        <div className="mb-6">
          <AdminCollapsibleSection
            title={dictionary.dur.resourceGroups.title}
            subtitle={dictionary.dur.resourceGroups.subtitle}
            defaultOpen={false}
          >
            <DurResourceGroupsClient />
          </AdminCollapsibleSection>
        </div>
      ) : null}

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

      <MachinesClientMachineFormPanel
        ref={machineFormRef}
        dict={dict}
        apiErrors={apiErrors}
        categories={categories}
        resourceGroups={resourceGroups}
        durEnabled={durEnabled}
        fetchData={fetchData}
      />
    </>
  );
}
