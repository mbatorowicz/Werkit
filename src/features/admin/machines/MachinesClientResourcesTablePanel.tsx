"use client";

import type { AppDictionary } from "@/i18n/types";
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
  const handleMDelete = async (id: number) => {
    if (!confirm(dict.confirmMachDelete)) return;
    const res = await fetch(`/api/machines/${id}`, { method: "DELETE" });
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()).error;
      alert(apiErrors[err] || err);
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
