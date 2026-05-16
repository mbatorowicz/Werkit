"use client";

import type { AppDictionary } from "@/i18n/types";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { MachinesResourcesTable } from "@/features/admin/machines/MachinesResourcesTable";
import type { MachinesCategory, MachinesResource } from "@/features/admin/machines/types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  apiErrors: Record<string, string>;
  machines: MachinesResource[];
  categories: MachinesCategory[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
  onAddResource: () => void;
  onEditResource: (machine: MachinesResource) => void;
};

export function MachinesClientResourcesTablePanel({
  dict,
  apiErrors,
  machines,
  categories,
  isLoading,
  canMutate,
  fetchData,
  onAddResource,
  onEditResource,
}: Props) {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const handleMDelete = async (id: number) => {
    if (!(await appConfirm({ message: dict.confirmMachDelete, variant: "danger" }))) return;
    const res = await fetchWithDeviceTelemetry(
      `Admin machines: delete resource ${id}`,
      `/api/machines/${id}`,
      { method: "DELETE" },
      { category: "admin" },
    );
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()).error;
      await appAlert({ message: appDialogApiMessage(apiErrors, err, dict.apiError) });
    }
  };

  return (
    <MachinesResourcesTable
      dict={dict}
      machines={machines}
      categories={categories}
      isLoading={isLoading}
      canMutate={canMutate}
      onAddResource={onAddResource}
      onEditResource={onEditResource}
      onDeleteResource={handleMDelete}
    />
  );
}
