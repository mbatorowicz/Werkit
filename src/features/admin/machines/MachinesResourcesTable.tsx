"use client";

import Image from "next/image";
import { Edit2, Plus, Trash2, Truck } from "lucide-react";
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
              ) : (
                machines.map((machine) => {
                  const mCats = categories.filter((c) => machine.categoryIds?.includes(c.id));
                  return (
                    <tr key={machine.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
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
                              onClick={() => onEditResource(machine)}
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-amber-500/10 hover:text-amber-500 dark:text-zinc-400"
                              title={dict.editTitle}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteResource(machine.id)}
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
              {!isLoading && machines.length === 0 ? (
                <tr>
                  <td colSpan={canMutate ? 3 : 2} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {dict.noMachines}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
