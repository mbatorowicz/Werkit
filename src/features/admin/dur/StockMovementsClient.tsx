"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Package } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { narrowStockReceipts, narrowStockIssues } from "@/lib/narrow/dur";
import type { StockReceipt, StockIssue } from "@/types/dur";
import { StockReceiptForm } from "./StockReceiptForm";
import { StockIssueForm } from "./StockIssueForm";
import { StockReceiptsTable } from "./StockReceiptsTable";
import { StockIssuesTable } from "./StockIssuesTable";

type Tab = "receipts" | "issues";

export default function StockMovementsClient() {
  const { canMutate } = useAdminAbility();

  const dictionary = getDictionary();
  const wDict = dictionary.dur.warehouse;

  const [tab, setTab] = useState<Tab>("receipts");
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Receipt form
  const [rPartId, setRPartId] = useState("");
  const [rQuantity, setRQuantity] = useState("");
  const [rUnitPrice, setRUnitPrice] = useState("");
  const [rInvoiceNumber, setRInvoiceNumber] = useState("");
  const [rNotes, setRNotes] = useState("");

  // Issue form
  const [iPartId, setIPartId] = useState("");
  const [iQuantity, setIQuantity] = useState("");
  const [iWorkOrderId, setIWorkOrderId] = useState("");
  const [iIssuedTo, setIIssuedTo] = useState("");
  const [iNotes, setINotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [recRes, issRes] = await Promise.all([
        fetch("/api/dur/stock/receipts"),
        fetch("/api/dur/stock/issues"),
      ]);
      setReceipts(narrowStockReceipts(await recRes.json()));
      setIssues(narrowStockIssues(await issRes.json()));
    } catch {
      setReceipts([]);
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

  const openAddModal = useCallback(() => {
    setRPartId("");
    setRQuantity("");
    setRUnitPrice("");
    setRInvoiceNumber("");
    setRNotes("");
    setIPartId("");
    setIQuantity("");
    setIWorkOrderId("");
    setIIssuedTo("");
    setINotes("");
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);


  const currentDict = tab === "receipts" ? wDict.receipts : wDict.issues;
  const currentData = tab === "receipts" ? receipts : issues;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{wDict.title}</h1>
          <p className="text-sm text-zinc-500 mt-1">{wDict.subtitle}</p>
        </div>
        {canMutate && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition"
          >
            <Plus className="w-4 h-4" />
            {currentDict.add}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setTab("receipts")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "receipts"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          {wDict.receipts.title}
        </button>
        <button
          onClick={() => setTab("issues")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "issues"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          {wDict.issues.title}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">{dictionary.admin.ui.searchNoResults || "Ładowanie…"}</div>
      ) : currentData.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
          <p>{currentDict.empty}</p>
        </div>
      ) : tab === "receipts" ? (
        <StockReceiptsTable
          receipts={receipts as (StockReceipt & { partName?: string; partCatalogNumber?: string; creatorName?: string })[]}
          dict={wDict.receipts}
        />
      ) : (
        <StockIssuesTable
          issues={issues as (StockIssue & { partName?: string; partCatalogNumber?: string; creatorName?: string; workOrderLabel?: string })[]}
          dict={wDict.issues}
        />
      )}

      {/* Add Modal */}
      {showModal && (
        <AdminModalShell
          open={showModal}
          title={currentDict.add}
          onClose={closeModal}
          closeOnBackdropClick={false}
          footer={
            <FormModalFooter
              formId={tab === "receipts" ? "receipt-form" : "issue-form"}
              onCancel={closeModal}
              submitLabel="Zapisz"
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
              onPartIdChange={setRPartId}
              onQuantityChange={setRQuantity}
              onUnitPriceChange={setRUnitPrice}
              onInvoiceNumberChange={setRInvoiceNumber}
              onNotesChange={setRNotes}
              dict={wDict.receipts.fields}
            />
          ) : (
            <StockIssueForm
              iPartId={iPartId}
              iQuantity={iQuantity}
              iWorkOrderId={iWorkOrderId}
              iIssuedTo={iIssuedTo}
              iNotes={iNotes}
              onPartIdChange={setIPartId}
              onQuantityChange={setIQuantity}
              onWorkOrderIdChange={setIWorkOrderId}
              onIssuedToChange={setIIssuedTo}
              onNotesChange={setINotes}
              dict={wDict.issues.fields}
            />
          )}
        </AdminModalShell>
      )}
    </>
  );
}
