"use client";

import type { AppDictionary } from "@/i18n/types";
import { AdminCategoryColorFieldRow } from "@/components/Admin/AdminCategoryColorFieldRow";
import { categorySharedLabels } from "@/lib/categoryI18n";
import { useDictionary } from "@/i18n";
import type { OrderType } from "@/types/worker";
import { ResourceCategoryParamsSection } from "./ResourceCategoryParamsSection";
import type { CategoryFormState } from "./types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  form: CategoryFormState;
  setForm: React.Dispatch<React.SetStateAction<CategoryFormState>>;
};

export function ResourceCategoryLeafFields({ dict, form, setForm }: Props) {
  const dictionary = useDictionary();
  const shared = categorySharedLabels(dictionary, "admin");

  return (
    <>
      <AdminCategoryColorFieldRow
        color={form.color}
        onColorChange={(color) => setForm({ ...form, color })}
        label={shared.colorLabel}
        hint={shared.colorHint}
      />

      <section className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {dict.orderTypeTitle}
        </h3>
        <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
          {dict.orderTypeHint}
        </p>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.orderTypeLabel}
        </label>
        <select
          value={form.orderType}
          onChange={(e) => setForm({ ...form, orderType: e.target.value as OrderType })}
          className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <option value="machine_work">{dict.machineWork}</option>
          <option value="machine_repair">{dict.machineRepair}</option>
        </select>
      </section>

      <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {dict.catMobilityTitle}
        </h3>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 pr-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {dict.isStationaryLabel}
            </label>
            <span className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
              {dict.isStationaryDesc}
            </span>
          </div>
          <input
            type="checkbox"
            checked={form.isStationary}
            onChange={(e) => setForm({ ...form, isStationary: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded text-emerald-600"
          />
        </div>
      </section>

      <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {dict.catResourceFormTitle}
        </h3>
        <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
          {dict.catResourceFormHint}
        </p>
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span>{dict.fieldResourceName}</span>
            <input
              type="checkbox"
              checked={form.showResourceName}
              onChange={(e) => setForm({ ...form, showResourceName: e.target.checked })}
              className="h-4 w-4 shrink-0 rounded text-emerald-600"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span>{dict.fieldResourceDescription}</span>
            <input
              type="checkbox"
              checked={form.showResourceDescription}
              onChange={(e) => setForm({ ...form, showResourceDescription: e.target.checked })}
              className="h-4 w-4 shrink-0 rounded text-emerald-600"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span>{dict.fieldResourceRegistration}</span>
            <input
              type="checkbox"
              checked={form.showRegistrationNumber}
              onChange={(e) => setForm({ ...form, showRegistrationNumber: e.target.checked })}
              className="h-4 w-4 shrink-0 rounded text-emerald-600"
            />
          </label>
        </div>
      </section>

      <ResourceCategoryParamsSection dict={dict} form={form} setForm={setForm} />
    </>
  );
}
