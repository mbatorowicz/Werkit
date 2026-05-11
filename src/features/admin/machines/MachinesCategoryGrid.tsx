"use client";

import { Edit2, Layers, Plus, Trash2 } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { CategoryFormState, MachinesCategory } from "./types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  categories: MachinesCategory[];
  isLoading: boolean;
  canMutate: boolean;
  onAdd: () => void;
  onEdit: (cat: MachinesCategory) => void;
  onDelete: (id: number) => void;
};

export function MachinesCategoryGrid({ dict, categories, isLoading, canMutate, onAdd, onEdit, onDelete }: Props) {
  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 pt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Layers className="h-5 w-5 text-amber-500" /> {dict.dictTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{dict.dictSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" /> {dict.addCategory}
          </button>
        ) : null}
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-700 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 truncate">
              <div className="h-5 w-5 shrink-0 rounded-md shadow-sm" style={{ backgroundColor: cat.color || "#3f3f46" }} />
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">{cat.name}</span>
              {cat.isStationary ? (
                <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  {dict.badgeStationary}
                </span>
              ) : null}
            </div>
            {canMutate ? (
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onEdit(cat)}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-amber-500 dark:text-zinc-400"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(cat.id)}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-red-500 dark:text-zinc-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {!isLoading && categories.length === 0 ? (
          <div className="col-span-full rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:text-zinc-400">
            {dict.noCategories}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function categoryToForm(cat: MachinesCategory): CategoryFormState {
  return {
    name: cat.name,
    icon: cat.icon || "blue",
    showCustomer: cat.showCustomer,
    showMaterial: cat.showMaterial,
    showQuantity: cat.showQuantity,
    showTaskDescription: cat.showTaskDescription,
    reqCustomer: cat.reqCustomer,
    reqMaterial: cat.reqMaterial,
    reqQuantity: cat.reqQuantity,
    reqTaskDescription: cat.reqTaskDescription,
    isGlobal: cat.isGlobal,
    isStationary: cat.isStationary,
    color: cat.color || "#3f3f46",
    showResourceName: cat.showResourceName !== false,
    showResourceDescription: Boolean(cat.showResourceDescription),
    showRegistrationNumber: cat.showRegistrationNumber !== false,
  };
}
