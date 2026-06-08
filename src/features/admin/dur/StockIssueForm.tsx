"use client";

import { AdminFormField } from "@/components/Admin/AdminFormField";
import {
  INVENTORY_FORM_CONTROL,
  INVENTORY_FORM_STACK,
  INVENTORY_FORM_TEXTAREA,
} from "@/components/Admin/adminInventoryFormStyles";
import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { DecimalInput } from "@/components/DecimalInput";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { useDictionary } from "@/i18n";

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
  const comboboxCommon = comboboxFeedbackProps(useDictionary().admin.orders);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`${INVENTORY_FORM_STACK} p-6`}
      id="issue-form"
    >
      <AdminFormField label={dict.part} required>
        <SparePartSearchField
          options={partOptions}
          value={iPartId}
          onChange={onPartIdChange}
          placeholder={partsLoading ? "…" : dict.partPlaceholder}
          disabled={partsLoading}
          required
          aria-label={dict.part}
        />
      </AdminFormField>

      <AdminFormField label={dict.quantity} required>
        <DecimalInput
          value={iQuantity}
          onChange={onQuantityChange}
          placeholder={dict.quantityPlaceholder}
          className={INVENTORY_FORM_CONTROL}
          required
        />
      </AdminFormField>

      <AdminFormField label={dict.workOrder}>
        <AdminSearchCombobox
          options={workOrderOptions}
          value={iWorkOrderId}
          onChange={onWorkOrderIdChange}
          placeholder={refsLoading ? "…" : dict.workOrderPlaceholder}
          disabled={refsLoading}
          aria-label={dict.workOrder}
          {...comboboxCommon}
        />
      </AdminFormField>

      <AdminFormField label={dict.issuedTo}>
        <AdminSearchCombobox
          options={userOptions}
          value={iIssuedTo}
          onChange={onIssuedToChange}
          placeholder={refsLoading ? "…" : dict.issuedToPlaceholder}
          disabled={refsLoading}
          aria-label={dict.issuedTo}
          {...comboboxCommon}
        />
      </AdminFormField>

      <AdminFormField label={dict.notes}>
        <textarea
          value={iNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={dict.notesPlaceholder}
          rows={3}
          className={INVENTORY_FORM_TEXTAREA}
        />
      </AdminFormField>
    </form>
  );
}
