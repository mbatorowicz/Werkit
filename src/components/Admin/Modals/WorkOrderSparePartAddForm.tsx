"use client";

import { type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { DecimalInput } from "@/components/DecimalInput";
import { useDictionary } from "@/i18n";

const CONTROL =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none";

interface WorkOrderSparePartAddFormProps {
  catalogOptions: AdminSearchComboboxOption[];
  selectedPartId: string;
  onSelectedPartIdChange: (value: string) => void;
  addQuantity: string;
  onAddQuantityChange: (value: string) => void;
  addUnitPrice: string;
  onAddUnitPriceChange: (value: string) => void;
  addNotes: string;
  onAddNotesChange: (value: string) => void;
  isAdding: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WorkOrderSparePartAddForm({
  catalogOptions,
  selectedPartId,
  onSelectedPartIdChange,
  addQuantity,
  onAddQuantityChange,
  addUnitPrice,
  onAddUnitPriceChange,
  addNotes,
  onAddNotesChange,
  isAdding,
  onSubmit,
  onCancel,
}: WorkOrderSparePartAddFormProps) {
  const dict = useDictionary();
  const durDict = dict.dur.workOrderSpareParts;
  const adminOrdersDict = dict.admin.orders;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-3">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {durDict.fields.part}
        </label>
        <SparePartSearchField
          options={catalogOptions}
          value={selectedPartId}
          onChange={onSelectedPartIdChange}
          placeholder={durDict.fields.partPlaceholder}
          required
          aria-label={durDict.fields.part}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {durDict.fields.quantity}
          </label>
          <DecimalInput
            value={addQuantity}
            onChange={onAddQuantityChange}
            placeholder={durDict.fields.quantityPlaceholder}
            className={CONTROL}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {durDict.fields.unitPrice}
          </label>
          <DecimalInput
            value={addUnitPrice}
            onChange={onAddUnitPriceChange}
            placeholder={durDict.fields.unitPricePlaceholder}
            className={CONTROL}
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {durDict.fields.notes}
        </label>
        <input
          type="text"
          value={addNotes}
          onChange={(e) => onAddNotesChange(e.target.value)}
          placeholder={durDict.fields.notesPlaceholder}
          className={CONTROL}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
        >
          Anuluj
        </button>
        <button
          type="button"
          disabled={!selectedPartId || isAdding}
          onClick={onSubmit}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? adminOrdersDict.saving : adminOrdersDict.addSparePart}
        </button>
      </div>
    </div>
  );
}
