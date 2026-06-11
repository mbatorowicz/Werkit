"use client";

import type { ComponentProps } from "react";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { DecimalInput } from "@/components/DecimalInput";
import type { AppDictionary } from "@/i18n/types";

const CONTROL =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none";

export function WorkerSparePartsAddForm({
  workerDict,
  catalogOptions,
  selectedPartId,
  setSelectedPartId,
  addQuantity,
  setAddQuantity,
  addNotes,
  setAddNotes,
  isAdding,
  onCancel,
  onSubmit,
}: {
  workerDict: AppDictionary["worker"]["client"];
  catalogOptions: ComponentProps<typeof SparePartSearchField>["options"];
  selectedPartId: string;
  setSelectedPartId: (val: string) => void;
  addQuantity: string;
  setAddQuantity: (val: string) => void;
  addNotes: string;
  setAddNotes: (val: string) => void;
  isAdding: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mb-3 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {workerDict.choosePart}
        </label>
        <SparePartSearchField
          options={catalogOptions}
          value={selectedPartId}
          onChange={setSelectedPartId}
          placeholder={workerDict.choosePart}
          required
          aria-label={workerDict.choosePart}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {workerDict.partQuantity}
          </label>
          <DecimalInput
            value={addQuantity}
            onChange={setAddQuantity}
            placeholder={workerDict.quantityPlaceholder}
            className={CONTROL}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {workerDict.partNotes}
          </label>
          <input
            type="text"
            value={addNotes}
            onChange={(e) => setAddNotes(e.target.value)}
            placeholder={workerDict.sparePartNotesPlaceholder}
            className={CONTROL}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          Anuluj
        </button>
        <button
          type="button"
          disabled={!selectedPartId || isAdding}
          onClick={onSubmit}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdding ? "…" : workerDict.addSparePart}
        </button>
      </div>
    </div>
  );
}
