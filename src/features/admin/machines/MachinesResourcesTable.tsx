"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Edit2, Plus, Search, Trash2, Truck } from "lucide-react";
import { normalizeCatalogSearchQuery } from "@/lib/filterCatalogTree";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { getDictionary } from "@/i18n";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import type { AppDictionary } from "@/i18n/types";
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
  const ui = getDictionary().admin.ui;
  const [previewMachine, setPreviewMachine] = useState<MachinesResource | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMachines = useMemo(() => {
    const q = normalizeCatalogSearchQuery(searchQuery);
    if (!q) return machines;
    return machines.filter((machine) => {
      if (machine.name.toLocaleLowerCase("pl").includes(q)) return true;
      if (machine.registrationNumber?.toLocaleLowerCase("pl").includes(q)) return true;
      if (machine.description?.toLocaleLowerCase("pl").includes(q)) return true;
      const mCats = categories.filter((c) => machine.categoryIds?.includes(c.id));
      return mCats.some((c) => c.name.toLocaleLowerCase("pl").includes(q));
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
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            {dict.addResource}
          </button>
        ) : null}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={dict.resourceSearchPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          aria-label={dict.resourceSearchPlaceholder}
        />
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700/50 dark:bg-[#0a0a0b]/80">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {dict.resourceColTitle}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {dict.dictCategory}
                </th>
                {canMutate ? (
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {dict.management}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={canMutate ? 3 : 2} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {dict.fetching}
                  </td>
                </tr>
              ) : filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={canMutate ? 3 : 2} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {searchQuery.trim() ? dict.resourceSearchNoResults : dict.noMachines}
                  </td>
                </tr>
              ) : (
                filteredMachines.map((machine) => {
                  const mCats = categories.filter((c) => machine.categoryIds?.includes(c.id));
                  return (
                    <tr
                      key={machine.id}
                      onClick={() => setPreviewMachine(machine)}
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                            {machine.imageUrl ? (
                              <Image
                                src={machine.imageUrl}
                                alt={machine.name}
                                width={48}
                                height={48}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Truck className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-200">{machine.name}</div>
                            <div className="mt-0.5 text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                              {dict.idReg} #{machine.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {mCats.length > 0 ? (
                            mCats.map((c) => (
                              <span
                                key={c.id}
                                className="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${c.color || "#71717a"}1a`,
                                  color: c.color || "#71717a",
                                  borderColor: `${c.color || "#71717a"}33`,
                                }}
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs italic text-zinc-500">{dict.noCategoryBadge}</span>
                          )}
                        </div>
                      </td>
                      {canMutate ? (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                stopRowActionClick(e);
                                setPreviewMachine(null);
                                onEditResource(machine);
                              }}
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-amber-500/10 hover:text-amber-500 dark:text-zinc-400"
                              title={dict.editTitle}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                stopRowActionClick(e);
                                void onDeleteResource(machine.id);
                              }}
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-400"
                              title={dict.deleteTitle}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    <span
                      key={c.id}
                      className="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${c.color || "#71717a"}1a`,
                        color: c.color || "#71717a",
                        borderColor: `${c.color || "#71717a"}33`,
                      }}
                    >
                      {c.name}
                    </span>
                  ))}
                {(previewMachine.categoryIds?.length ?? 0) === 0 ? (
                  <span className="italic text-zinc-500">{dict.noCategoryBadge}</span>
                ) : null}
              </div>
            </AdminPreviewField>
            {previewMachine.registrationNumber ? (
              <AdminPreviewField label={dict.machRegLabel} value={previewMachine.registrationNumber} />
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


