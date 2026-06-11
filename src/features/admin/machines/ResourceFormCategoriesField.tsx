"use client";

import type { AppDictionary } from "@/i18n/types";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";
import type { MachineFormState, MachinesCategory } from "./types";

interface ResourceFormCategoriesFieldProps {
  dict: AppDictionary["admin"]["machines"];
  categories: MachinesCategory[];
  form: MachineFormState;
  setForm: React.Dispatch<React.SetStateAction<MachineFormState>>;
}

export function ResourceFormCategoriesField({
  dict,
  categories,
  form,
  setForm,
}: ResourceFormCategoriesFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        {dict.machCatLabel}
      </label>
      <div className={`grid max-h-48 grid-cols-2 gap-2 pr-1 ${INLINE_SCROLL_PANEL_CLASS}`}>
        {categories.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <input
              type="checkbox"
              checked={form.categoryIds.includes(c.id)}
              onChange={(e) => {
                setForm((prev) => {
                  if (e.target.checked)
                    return { ...prev, categoryIds: [...prev.categoryIds, c.id] };
                  return {
                    ...prev,
                    categoryIds: prev.categoryIds.filter((cid) => cid !== c.id),
                  };
                });
              }}
              className="h-4 w-4 rounded text-emerald-600"
            />
            <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{c.name}</span>
          </label>
        ))}
      </div>
      {categories.length === 0 ? (
        <p className="text-xs text-red-400">{dict.machCatWarning}</p>
      ) : null}
    </div>
  );
}
