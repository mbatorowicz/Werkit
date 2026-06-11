"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { formatDict, useDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { decimalStringForStorage } from "@/lib/decimalInput";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { StockReceiptForm } from "./StockReceiptForm";
import { StockIssueForm } from "./StockIssueForm";
import { StockMovementsTable } from "./StockMovementsTable";
import { useStockMovementsData } from "./useStockMovementsData";
import { useStockMovementRefs } from "./useStockMovementRefs";
import { useStockMovementForms } from "./useStockMovementForms";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";

type Tab = "receipts" | "issues";

export default function StockMovementsClient() {
  const { canMutate } = useAdminAbility();

  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const dWh = dictionary.dur.warehouse;
  const common = dictionary.common;
  const issuesDict = dWh.issues;
  const receiptsDict = dWh.receipts;

  const [tab, setTab] = useState<Tab>("issues");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { items: catalogItems, isLoading: catalogLoading, fetchCatalog } = useDurSparePartCatalog();
  const { workOrderOptions, userOptions, refsLoading, fetchRefs } = useStockMovementRefs();

  const partById = useMemo(() => new Map(catalogItems.map((p) => [p.id, p])), [catalogItems]);

  const partOptions = useMemo(
    () => durSparePartComboboxOptions(catalogItems, wh.stockSublabel),
    [catalogItems, wh.stockSublabel]
  );

  const { isLoading, fetchData, filteredReceipts, filteredIssues, issueTotalsByPart } =
    useStockMovementsData({ tab, searchQuery, partById });

  const closeModal = useCallback(() => setShowModal(false), []);

  const {
    isSubmitting,
    rPartId,
    rQuantity,
    rUnitPrice,
    rInvoiceNumber,
    rNotes,
    setRQuantity,
    setRUnitPrice,
    setRInvoiceNumber,
    setRNotes,
    iPartId,
    iQuantity,
    iWorkOrderId,
    iIssuedTo,
    iNotes,
    setIPartId,
    setIQuantity,
    setIWorkOrderId,
    setIIssuedTo,
    setINotes,
    resetForms,
    handleReceiptPartChange,
    handleSaveReceipt,
    handleSaveIssue,
  } = useStockMovementForms({ tab, catalogItems, fetchData, fetchCatalog, closeModal });

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
      void fetchCatalog();
    });
  }, [fetchData, fetchCatalog]);

  const openModal = useCallback(() => {
    resetForms();
    setShowModal(true);
    void fetchCatalog();
    if (tab === "issues") {
      void fetchRefs();
    }
  }, [resetForms, fetchCatalog, fetchRefs, tab]);

  useEffect(() => {
    if (!showModal || tab !== "issues") return;
    queueMicrotask(() => void fetchRefs());
  }, [showModal, tab, fetchRefs]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{wh.movementsTitle}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dWh.movementsSubtitle}</p>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("issues")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "issues"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {wh.tabIssues}
          </button>
          <button
            type="button"
            onClick={() => setTab("receipts")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "receipts"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {wh.tabReceipts}
          </button>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={openModal}
            className={cn("inline-flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {tab === "receipts" ? wh.addReceipt : wh.addIssue}
          </button>
        ) : null}
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={dWh.movementsSearchPlaceholder}
      />

      {issueTotalsByPart.length > 0 ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="mb-2 font-medium text-emerald-900 dark:text-emerald-200">
            {wh.movementsFilterSummary}
          </p>
          <ul className="space-y-1 text-emerald-800 dark:text-emerald-300">
            {issueTotalsByPart.map((item) => (
              <li key={item.partName}>
                {formatDict(wh.movementsFilterSummaryLine, {
                  item: item.partName,
                  qty: decimalStringForStorage(String(item.quantity)) ?? String(item.quantity),
                  unit: item.unit,
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <StockMovementsTable
        tab={tab}
        isLoading={isLoading}
        searchQuery={searchQuery}
        filteredReceipts={filteredReceipts}
        filteredIssues={filteredIssues}
        partById={partById}
      />

      <AdminModalShell
        open={showModal && canMutate}
        onClose={() => setShowModal(false)}
        title={tab === "receipts" ? wh.modalReceiptTitle : wh.modalIssueTitle}
        closeOnBackdropClick={false}
        scrollableBody
        footer={
          <FormModalFooter
            formId={tab === "receipts" ? "receipt-form" : "issue-form"}
            onCancel={() => setShowModal(false)}
            submitLabel={isSubmitting ? dictionary.dur.spareParts.saving : common.actions.save}
            cancelLabel={common.actions.cancel}
            isSubmitting={isSubmitting}
            submitDisabled={tab === "receipts" ? !rPartId : !iPartId}
          />
        }
      >
        {tab === "receipts" ? (
          <StockReceiptForm
            rPartId={rPartId}
            rQuantity={rQuantity}
            rUnitPrice={rUnitPrice}
            rInvoiceNumber={rInvoiceNumber}
            rNotes={rNotes}
            partOptions={partOptions}
            partsLoading={catalogLoading}
            onPartIdChange={handleReceiptPartChange}
            onQuantityChange={setRQuantity}
            onUnitPriceChange={setRUnitPrice}
            onInvoiceNumberChange={setRInvoiceNumber}
            onNotesChange={setRNotes}
            onSubmit={() => void handleSaveReceipt()}
            dict={receiptsDict.fields}
          />
        ) : (
          <StockIssueForm
            iPartId={iPartId}
            iQuantity={iQuantity}
            iWorkOrderId={iWorkOrderId}
            iIssuedTo={iIssuedTo}
            iNotes={iNotes}
            partOptions={partOptions}
            workOrderOptions={workOrderOptions}
            userOptions={userOptions}
            partsLoading={catalogLoading}
            refsLoading={refsLoading}
            onPartIdChange={setIPartId}
            onQuantityChange={setIQuantity}
            onWorkOrderIdChange={setIWorkOrderId}
            onIssuedToChange={setIIssuedTo}
            onNotesChange={setINotes}
            onSubmit={() => void handleSaveIssue()}
            dict={issuesDict.fields}
          />
        )}
      </AdminModalShell>
    </>
  );
}
