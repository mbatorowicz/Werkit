"use client";

import { formatDict, useDictionary } from "@/i18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { AdminFormField } from "@/components/Admin/AdminFormField";
import {
  INVENTORY_FORM_CONTROL,
  INVENTORY_FORM_STACK,
  INVENTORY_FORM_TEXTAREA,
} from "@/components/Admin/adminInventoryFormStyles";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { DecimalInput } from "@/components/DecimalInput";
import { FormModalFooter } from "@/components/FormModalFooter";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { MaterialRow } from "@/features/admin/materials/types";

interface MaterialStockMovementModalProps {
  open: boolean;
  tab: "receipts" | "issues";
  isSubmitting: boolean;
  materialOptions: AdminSearchComboboxOption[];
  selectedMaterial: MaterialRow | null;
  materialId: string;
  quantity: string;
  unitPrice: string;
  invoiceNumber: string;
  notes: string;
  onMaterialIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onUnitPriceChange: (value: string) => void;
  onInvoiceNumberChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function MaterialStockMovementModal({
  open,
  tab,
  isSubmitting,
  materialOptions,
  selectedMaterial,
  materialId,
  quantity,
  unitPrice,
  invoiceNumber,
  notes,
  onMaterialIdChange,
  onQuantityChange,
  onUnitPriceChange,
  onInvoiceNumberChange,
  onNotesChange,
  onClose,
  onSubmit,
}: MaterialStockMovementModalProps) {
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const matWh = dictionary.admin.materials.warehouse;
  const common = dictionary.common;
  const comboboxCommon = comboboxFeedbackProps(dictionary.admin.orders);

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={tab === "receipts" ? wh.modalReceiptTitle : wh.modalIssueTitle}
      maxWidthClass="max-w-md"
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="material-stock-form"
          onCancel={onClose}
          isSubmitting={isSubmitting}
          submitLabel={common.actions.save}
          cancelLabel={common.actions.cancel}
        />
      }
    >
      <form id="material-stock-form" onSubmit={onSubmit} className={`${INVENTORY_FORM_STACK} p-6`}>
        <AdminFormField label={matWh.fieldMaterial} required>
          <AdminSearchCombobox
            options={materialOptions}
            value={materialId}
            onChange={onMaterialIdChange}
            placeholder={matWh.fieldMaterialPlaceholder}
            aria-label={matWh.fieldMaterial}
            required
            {...comboboxCommon}
          />
        </AdminFormField>

        <AdminFormField
          label={
            selectedMaterial
              ? formatDict(matWh.fieldQuantityWithUnit, {
                  unit: selectedMaterial.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
                })
              : matWh.fieldQuantity
          }
          required
        >
          <DecimalInput
            value={quantity}
            onChange={onQuantityChange}
            placeholder="0"
            className={INVENTORY_FORM_CONTROL}
            required
          />
        </AdminFormField>

        {tab === "receipts" ? (
          <>
            <AdminFormField label={matWh.fieldUnitPrice}>
              <DecimalInput
                value={unitPrice}
                onChange={onUnitPriceChange}
                placeholder="0"
                className={INVENTORY_FORM_CONTROL}
              />
            </AdminFormField>
            <AdminFormField label={matWh.fieldInvoice}>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => onInvoiceNumberChange(e.target.value)}
                className={INVENTORY_FORM_CONTROL}
              />
            </AdminFormField>
          </>
        ) : null}

        <AdminFormField label={matWh.fieldNotes}>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            className={INVENTORY_FORM_TEXTAREA}
          />
        </AdminFormField>
      </form>
    </AdminModalShell>
  );
}
