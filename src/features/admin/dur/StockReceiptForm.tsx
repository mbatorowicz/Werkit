"use client";

import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";

interface StockReceiptFormProps {
  rPartId: string;
  rQuantity: string;
  rUnitPrice: string;
  rInvoiceNumber: string;
  rNotes: string;
  partOptions: AdminSearchComboboxOption[];
  partsLoading?: boolean;
  onPartIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onUnitPriceChange: (value: string) => void;
  onInvoiceNumberChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  dict: {
    part: string;
    partPlaceholder: string;
    quantity: string;
    quantityPlaceholder: string;
    unitPrice: string;
    unitPricePlaceholder: string;
    invoiceNumber: string;
    invoiceNumberPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
  };
}

export function StockReceiptForm({
  rPartId,
  rQuantity,
  rUnitPrice,
  rInvoiceNumber,
  rNotes,
  partOptions,
  partsLoading = false,
  onPartIdChange,
  onQuantityChange,
  onUnitPriceChange,
  onInvoiceNumberChange,
  onNotesChange,
  onSubmit,
  dict,
}: StockReceiptFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 p-6"
      id="receipt-form"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.part}
        </label>
        <SparePartSearchField
          options={partOptions}
          value={rPartId}
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
          value={rQuantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          placeholder={dict.quantityPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.unitPrice}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={rUnitPrice}
          onChange={(e) => onUnitPriceChange(e.target.value)}
          placeholder={dict.unitPricePlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.invoiceNumber}
        </label>
        <input
          type="text"
          value={rInvoiceNumber}
          onChange={(e) => onInvoiceNumberChange(e.target.value)}
          placeholder={dict.invoiceNumberPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.notes}
        </label>
        <textarea
          value={rNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={dict.notesPlaceholder}
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>
    </form>
  );
}
