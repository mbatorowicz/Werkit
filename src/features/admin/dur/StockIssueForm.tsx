"use client";

import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { getDictionary } from "@/i18n";

interface StockIssueFormProps {
  iPartId: string;
  iQuantity: string;
  iWorkOrderId: string;
  iIssuedTo: string;
  iNotes: string;
  partOptions: AdminSearchComboboxOption[];
  workOrderOptions: AdminSearchComboboxOption[];
  userOptions: AdminSearchComboboxOption[];
  partsLoading?: boolean;
  refsLoading?: boolean;
  onPartIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onWorkOrderIdChange: (value: string) => void;
  onIssuedToChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  dict: {
    part: string;
    partPlaceholder: string;
    quantity: string;
    quantityPlaceholder: string;
    workOrder: string;
    workOrderPlaceholder: string;
    issuedTo: string;
    issuedToPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
  };
}

export function StockIssueForm({
  iPartId,
  iQuantity,
  iWorkOrderId,
  iIssuedTo,
  iNotes,
  partOptions,
  workOrderOptions,
  userOptions,
  partsLoading = false,
  refsLoading = false,
  onPartIdChange,
  onQuantityChange,
  onWorkOrderIdChange,
  onIssuedToChange,
  onNotesChange,
  onSubmit,
  dict,
}: StockIssueFormProps) {
  const comboboxCommon = comboboxFeedbackProps(getDictionary().admin.orders);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 p-6"
      id="issue-form"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.part}
        </label>
        <SparePartSearchField
          options={partOptions}
          value={iPartId}
          onChange={onPartIdChange}
          placeholder={partsLoading ? "…" : dict.partPlaceholder}
          disabled={partsLoading}
          required
          aria-label={dict.part}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.quantity}
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={iQuantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          placeholder={dict.quantityPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.workOrder}
        </label>
        <AdminSearchCombobox
          options={workOrderOptions}
          value={iWorkOrderId}
          onChange={onWorkOrderIdChange}
          placeholder={refsLoading ? "…" : dict.workOrderPlaceholder}
          disabled={refsLoading}
          aria-label={dict.workOrder}
          {...comboboxCommon}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.issuedTo}
        </label>
        <AdminSearchCombobox
          options={userOptions}
          value={iIssuedTo}
          onChange={onIssuedToChange}
          placeholder={refsLoading ? "…" : dict.issuedToPlaceholder}
          disabled={refsLoading}
          aria-label={dict.issuedTo}
          {...comboboxCommon}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.notes}
        </label>
        <textarea
          value={iNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={dict.notesPlaceholder}
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>
    </form>
  );
}
