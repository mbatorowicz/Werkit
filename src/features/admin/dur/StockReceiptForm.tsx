"use client";

import { AdminFormField } from "@/components/Admin/AdminFormField";
import {
  INVENTORY_FORM_CONTROL,
  INVENTORY_FORM_STACK,
  INVENTORY_FORM_TEXTAREA,
} from "@/components/Admin/adminInventoryFormStyles";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { DecimalInput } from "@/components/DecimalInput";
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
      className={`${INVENTORY_FORM_STACK} p-6`}
      id="receipt-form"
    >
      <AdminFormField label={dict.part} required>
        <SparePartSearchField
          options={partOptions}
          value={rPartId}
          onChange={onPartIdChange}
          placeholder={partsLoading ? "…" : dict.partPlaceholder}
          disabled={partsLoading}
          required
          aria-label={dict.part}
        />
      </AdminFormField>

      <AdminFormField label={dict.quantity} required>
        <DecimalInput
          value={rQuantity}
          onChange={onQuantityChange}
          placeholder={dict.quantityPlaceholder}
          className={INVENTORY_FORM_CONTROL}
          required
        />
      </AdminFormField>

      <AdminFormField label={dict.unitPrice}>
        <DecimalInput
          value={rUnitPrice}
          onChange={onUnitPriceChange}
          placeholder={dict.unitPricePlaceholder}
          className={INVENTORY_FORM_CONTROL}
        />
      </AdminFormField>

      <AdminFormField label={dict.invoiceNumber}>
        <input
          type="text"
          value={rInvoiceNumber}
          onChange={(e) => onInvoiceNumberChange(e.target.value)}
          placeholder={dict.invoiceNumberPlaceholder}
          className={INVENTORY_FORM_CONTROL}
        />
      </AdminFormField>

      <AdminFormField label={dict.notes}>
        <textarea
          value={rNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={dict.notesPlaceholder}
          rows={3}
          className={INVENTORY_FORM_TEXTAREA}
        />
      </AdminFormField>
    </form>
  );
}
