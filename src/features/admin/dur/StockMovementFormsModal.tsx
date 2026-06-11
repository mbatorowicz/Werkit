"use client";

import { useDictionary } from "@/i18n";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { StockReceiptForm } from "./StockReceiptForm";
import { StockIssueForm } from "./StockIssueForm";
import type { useStockMovementForms } from "./useStockMovementForms";

interface StockMovementFormsModalProps {
  open: boolean;
  tab: "receipts" | "issues";
  onClose: () => void;
  forms: ReturnType<typeof useStockMovementForms>;
  partOptions: AdminSearchComboboxOption[];
  workOrderOptions: AdminSearchComboboxOption[];
  userOptions: AdminSearchComboboxOption[];
  catalogLoading: boolean;
  refsLoading: boolean;
}

export function StockMovementFormsModal({
  open,
  tab,
  onClose,
  forms,
  partOptions,
  workOrderOptions,
  userOptions,
  catalogLoading,
  refsLoading,
}: StockMovementFormsModalProps) {
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const common = dictionary.common;
  const issuesDict = dictionary.dur.warehouse.issues;
  const receiptsDict = dictionary.dur.warehouse.receipts;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={tab === "receipts" ? wh.modalReceiptTitle : wh.modalIssueTitle}
      closeOnBackdropClick={false}
      scrollableBody
      footer={
        <FormModalFooter
          formId={tab === "receipts" ? "receipt-form" : "issue-form"}
          onCancel={onClose}
          submitLabel={forms.isSubmitting ? dictionary.dur.spareParts.saving : common.actions.save}
          cancelLabel={common.actions.cancel}
          isSubmitting={forms.isSubmitting}
          submitDisabled={tab === "receipts" ? !forms.rPartId : !forms.iPartId}
        />
      }
    >
      {tab === "receipts" ? (
        <StockReceiptForm
          rPartId={forms.rPartId}
          rQuantity={forms.rQuantity}
          rUnitPrice={forms.rUnitPrice}
          rInvoiceNumber={forms.rInvoiceNumber}
          rNotes={forms.rNotes}
          partOptions={partOptions}
          partsLoading={catalogLoading}
          onPartIdChange={forms.handleReceiptPartChange}
          onQuantityChange={forms.setRQuantity}
          onUnitPriceChange={forms.setRUnitPrice}
          onInvoiceNumberChange={forms.setRInvoiceNumber}
          onNotesChange={forms.setRNotes}
          onSubmit={() => void forms.handleSaveReceipt()}
          dict={receiptsDict.fields}
        />
      ) : (
        <StockIssueForm
          iPartId={forms.iPartId}
          iQuantity={forms.iQuantity}
          iWorkOrderId={forms.iWorkOrderId}
          iIssuedTo={forms.iIssuedTo}
          iNotes={forms.iNotes}
          partOptions={partOptions}
          workOrderOptions={workOrderOptions}
          userOptions={userOptions}
          partsLoading={catalogLoading}
          refsLoading={refsLoading}
          onPartIdChange={forms.setIPartId}
          onQuantityChange={forms.setIQuantity}
          onWorkOrderIdChange={forms.setIWorkOrderId}
          onIssuedToChange={forms.setIIssuedTo}
          onNotesChange={forms.setINotes}
          onSubmit={() => void forms.handleSaveIssue()}
          dict={issuesDict.fields}
        />
      )}
    </AdminModalShell>
  );
}
