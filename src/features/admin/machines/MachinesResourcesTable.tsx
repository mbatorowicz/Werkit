"use client";

import { useMemo, useState } from "react";
import { Plus, Truck } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { CategoryColorBadge } from "@/components/CategoryColorBadge";
import { useDictionary } from "@/i18n";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import {
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TH,
  TABLE_TH_RIGHT,
} from "@/lib/uiTable";
import type { AppDictionary } from "@/i18n/types";
import { MachinesResourceRow } from "./MachinesResourceRow";
import type { MachinesCategory, MachinesResource } from "./types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  machines: MachinesResource[];
  categories: MachinesCategory[];
  isLoading: boolean;
  canMutate: boolean;
  onAddResource: () => void;
  onEditResource: (machine: MachinesResource) => void;
  onDeleteResource: (id: number) => void;
};

export function MachinesResourcesTable({
  dict,
  machines,
  categories,
  isLoading,
  canMutate,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: Props) {
  const ui = useDictionary().admin.ui;
  const [previewMachine, setPreviewMachine] = useState<MachinesResource | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMachines = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return machines;
    return machines.filter((machine) => {
      if (matchesSearchQuery(machine.name, q)) return true;
      if (machine.registrationNumber && matchesSearchQuery(machine.registrationNumber, q))
        return true;
      if (machine.description && matchesSearchQuery(machine.description, q)) return true;
      const mCats = categories.filter((c) => machine.categoryIds?.includes(c.id));
      return mCats.some((c) => matchesSearchQuery(c.name, q));
    });
  }, [machines, categories, searchQuery]);

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-t border-zinc-800/80 pt-10 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Truck className="h-6 w-6 text-emerald-500" /> {dict.sectionVehiclesTitle}
          </h2>
          <p className="mt-1 text-zinc-500">{dict.fleetSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={onAddResource}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {dict.addResource}
          </button>
        ) : null}
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={dict.resourceSearchPlaceholder}
      />

      <AdminTableShell minWidthClass="min-w-[600px]">
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_TH}>{dict.resourceColTitle}</th>
            <th className={TABLE_TH}>{dict.dictCategory}</th>
            {canMutate ? <th className={TABLE_TH_RIGHT}>{dict.management}</th> : null}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={canMutate ? 3 : 2} className={TABLE_EMPTY_CELL}>
                {dict.fetching}
              </td>
            </tr>
          ) : filteredMachines.length === 0 ? (
            <tr>
              <td colSpan={canMutate ? 3 : 2} className={TABLE_EMPTY_CELL}>
                {searchQuery.trim() ? dict.resourceSearchNoResults : dict.noMachines}
              </td>
            </tr>
          ) : (
            filteredMachines.map((machine) => (
              <MachinesResourceRow
                key={machine.id}
                machine={machine}
                categories={categories}
                dict={dict}
                canMutate={canMutate}
                onPreview={setPreviewMachine}
                onEdit={(m) => {
                  setPreviewMachine(null);
                  onEditResource(m);
                }}
                onDelete={onDeleteResource}
              />
            ))
          )}
        </tbody>
      </AdminTableShell>

      <AdminPreviewModal
        open={previewMachine != null}
        onClose={() => setPreviewMachine(null)}
        title={ui.previewTitle}
        canEdit={canMutate}
        onEdit={
          previewMachine
            ? () => {
                setPreviewMachine(null);
                onEditResource(previewMachine);
              }
            : undefined
        }
        editLabel={dict.editTitle}
        maxWidthClass="max-w-md"
      >
        {previewMachine ? (
          <>
            <AdminPreviewField label={dict.resourceColTitle} value={previewMachine.name} />
            <AdminPreviewField label="ID" value={`#${previewMachine.id}`} />
            <AdminPreviewField label={dict.dictCategory}>
              <div className="flex flex-wrap gap-1">
                {categories
                  .filter((c) => previewMachine.categoryIds?.includes(c.id))
                  .map((c) => (
                    <CategoryColorBadge key={c.id} label={c.name} color={c.color} />
                  ))}
                {(previewMachine.categoryIds?.length ?? 0) === 0 ? (
                  <span className="italic text-zinc-500">{dict.noCategoryBadge}</span>
                ) : null}
              </div>
            </AdminPreviewField>
            {previewMachine.registrationNumber ? (
              <AdminPreviewField
                label={dict.machRegLabel}
                value={previewMachine.registrationNumber}
              />
            ) : null}
            {previewMachine.description ? (
              <AdminPreviewField label={dict.machDescLabel} value={previewMachine.description} />
            ) : null}
          </>
        ) : null}
      </AdminPreviewModal>
    </>
  );
}
