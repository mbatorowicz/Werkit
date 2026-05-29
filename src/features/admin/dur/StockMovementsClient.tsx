"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Package } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import { narrowStockReceipts, narrowStockIssues } from "@/lib/narrow/dur";
import type { StockReceipt, StockIssue, StockReceiptInput, StockIssueInput } from "@/types/dur";

type Tab = "receipts" | "issues";

export default function StockMovementsClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert } = useAppDialog();

  const dictionary = getDictionary();
  const wDict = dictionary.dur.warehouse;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [tab, setTab] = useState<Tab>("receipts");
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSaveReceipt = useCallback(async () => {
    const partId = Number(rPartId);
    if (!partId || !rQuantity) {
      await appAlert({ message: "Wypełnij wymagane pola." });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: StockReceiptInput = {
        partId,
        quantity: rQuantity,
        unitPrice: rUnitPrice || null,
        invoiceNumber: rInvoiceNumber || null,
        notes: rNotes || null,
      };
      const res = await fetch("/api/dur/stock/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        await appAlert({ message: (err as { error?: string }).error || apiErrors.save_error || "Błąd zapisu." });
        return;
      }
      await fetchData();
      closeModal();
    } catch {
      await appAlert({ message: apiErrors.fetch_error || "Błąd sieci." });
    } finally {
      setIsSubmitting(false);
    }
  }, [rPartId, rQuantity, rUnitPrice, rInvoiceNumber, rNotes, appAlert, apiErrors, fetchData, closeModal]);

  const handleSaveIssue = useCallback(async () => {
    const partId = Number(iPartId);
    if (!partId || !iQuantity) {
      await appAlert({ message: "Wypełnij wymagane pola." });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: StockIssueInput = {
        partId,
        quantity: iQuantity,
        workOrderId: iWorkOrderId ? Number(iWorkOrderId) : null,
        issuedTo: iIssuedTo ? Number(iIssuedTo) : null,
        notes: iNotes || null,
      };
      const res = await fetch("/api/dur/stock/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        await appAlert({ message: (err as { error?: string }).error || apiErrors.save_error || "Błąd zapisu." });
        return;
      }
      await fetchData();
      closeModal();
    } catch {
      await appAlert({ message: apiErrors.fetch_error || "Błąd sieci." });
    } finally {
      setIsSubmitting(false);
    }
  }, [iPartId, iQuantity, iWorkOrderId, iIssuedTo, iNotes, appAlert, apiErrors, fetchData, closeModal]);

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
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.date}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.part}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.catalogNumber}</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.quantity}</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.unitPrice}</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.totalValue}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.invoiceNumber}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.createdBy}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.receipts.table.notes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {(receipts as (StockReceipt & { partName?: string; partCatalogNumber?: string; creatorName?: string })[]).map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{r.partName || `#${r.partId}`}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.partCatalogNumber || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-white">{r.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400">{r.unitPrice || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-white">
                    {r.unitPrice && r.quantity
                      ? (Number(r.unitPrice) * Number(r.quantity)).toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.invoiceNumber || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.creatorName || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.date}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.part}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.catalogNumber}</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.quantity}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.workOrder}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.issuedTo}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.createdBy}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{wDict.issues.table.notes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {(issues as (StockIssue & { partName?: string; partCatalogNumber?: string; creatorName?: string; workOrderLabel?: string })[]).map((iss) => (
                <tr key={iss.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(iss.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{iss.partName || `#${iss.partId}`}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{iss.partCatalogNumber || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-white">{iss.quantity}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{iss.workOrderLabel || (iss.workOrderId ? `#${iss.workOrderId}` : "—")}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{iss.issuedTo ? `#${iss.issuedTo}` : "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{iss.creatorName || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">{iss.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              isSubmitting={isSubmitting}
            />
          }
        >
          {tab === "receipts" ? (
            <form
              onSubmit={(e) => { e.preventDefault(); void handleSaveReceipt(); }}
              className="space-y-4"
              id="receipt-form"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.receipts.fields.part}
                </label>
                <input
                  type="number"
                  value={rPartId}
                  onChange={(e) => setRPartId(e.target.value)}
                  placeholder={wDict.receipts.fields.partPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.receipts.fields.quantity}
                </label>
                <input
                  type="text"
                  value={rQuantity}
                  onChange={(e) => setRQuantity(e.target.value)}
                  placeholder={wDict.receipts.fields.quantityPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.receipts.fields.unitPrice}
                </label>
                <input
                  type="text"
                  value={rUnitPrice}
                  onChange={(e) => setRUnitPrice(e.target.value)}
                  placeholder={wDict.receipts.fields.unitPricePlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.receipts.fields.invoiceNumber}
                </label>
                <input
                  type="text"
                  value={rInvoiceNumber}
                  onChange={(e) => setRInvoiceNumber(e.target.value)}
                  placeholder={wDict.receipts.fields.invoiceNumberPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.receipts.fields.notes}
                </label>
                <textarea
                  value={rNotes}
                  onChange={(e) => setRNotes(e.target.value)}
                  placeholder={wDict.receipts.fields.notesPlaceholder}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); void handleSaveIssue(); }}
              className="space-y-4"
              id="issue-form"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.issues.fields.part}
                </label>
                <input
                  type="number"
                  value={iPartId}
                  onChange={(e) => setIPartId(e.target.value)}
                  placeholder={wDict.issues.fields.partPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.issues.fields.quantity}
                </label>
                <input
                  type="text"
                  value={iQuantity}
                  onChange={(e) => setIQuantity(e.target.value)}
                  placeholder={wDict.issues.fields.quantityPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.issues.fields.workOrder}
                </label>
                <input
                  type="number"
                  value={iWorkOrderId}
                  onChange={(e) => setIWorkOrderId(e.target.value)}
                  placeholder={wDict.issues.fields.workOrderPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.issues.fields.issuedTo}
                </label>
                <input
                  type="number"
                  value={iIssuedTo}
                  onChange={(e) => setIIssuedTo(e.target.value)}
                  placeholder={wDict.issues.fields.issuedToPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {wDict.issues.fields.notes}
                </label>
                <textarea
                  value={iNotes}
                  onChange={(e) => setINotes(e.target.value)}
                  placeholder={wDict.issues.fields.notesPlaceholder}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </form>
          )}
        </AdminModalShell>
      )}
    </>
  );
}
