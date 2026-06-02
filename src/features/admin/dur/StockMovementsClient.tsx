"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Package } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { narrowStockReceipts, narrowStockIssues } from "@/lib/narrow/dur";
import { narrowAdminUserRows } from "@/lib/narrow/admin";
import { narrowUnifiedGanttItems } from "@/lib/narrow/admin";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import type { StockReceipt, StockIssue } from "@/types/dur";
import { StockReceiptForm } from "./StockReceiptForm";
import { StockIssueForm } from "./StockIssueForm";
import { StockReceiptsTable } from "./StockReceiptsTable";
import { StockIssuesTable } from "./StockIssuesTable";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";

type Tab = "receipts" | "issues";

export default function StockMovementsClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert } = useAppDialog();

  const dictionary = getDictionary();
  const wDict = dictionary.dur.warehouse;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;
  const globalApiErrors = dictionary.apiErrors as Record<string, string>;

  const [tab, setTab] = useState<Tab>("receipts");
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { items: catalogItems, isLoading: catalogLoading, fetchCatalog } = useDurSparePartCatalog();
  const [workOrderOptions, setWorkOrderOptions] = useState<AdminSearchComboboxOption[]>([]);
  const [userOptions, setUserOptions] = useState<AdminSearchComboboxOption[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rPartId, setRPartId] = useState("");
  const [rQuantity, setRQuantity] = useState("");
  const [rUnitPrice, setRUnitPrice] = useState("");
  const [rInvoiceNumber, setRInvoiceNumber] = useState("");
  const [rNotes, setRNotes] = useState("");

  const [iPartId, setIPartId] = useState("");
  const [iQuantity, setIQuantity] = useState("");
  const [iWorkOrderId, setIWorkOrderId] = useState("");
  const [iIssuedTo, setIIssuedTo] = useState("");
  const [iNotes, setINotes] = useState("");

  const partOptions = useMemo(
    () => durSparePartComboboxOptions(catalogItems, wDict.partStockSublabel),
    [catalogItems, wDict.partStockSublabel]
  );

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

  const fetchRefs = useCallback(async () => {
    setRefsLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([
        fetch("/api/admin/work-orders"),
        fetch("/api/admin/users"),
      ]);
      const orders = narrowUnifiedGanttItems(await parseJsonArray(ordersRes));
      const woOpts: AdminSearchComboboxOption[] = [];
      for (const o of orders) {
        if (o._type !== "ORDER") continue;
        const labelParts: string[] = [`#${o.id}`];
        if (typeof o.resourceName === "string" && o.resourceName) labelParts.push(o.resourceName);
        const desc =
          typeof o.taskDescription === "string" && o.taskDescription.trim()
            ? o.taskDescription.trim().slice(0, 60)
            : "";
        if (desc) labelParts.push(desc);
        woOpts.push({
          id: String(o.id),
          label: labelParts.join(" · "),
          searchText: `${o.id} ${o.resourceName ?? ""} ${o.taskDescription ?? ""}`,
        });
      }
      setWorkOrderOptions(woOpts);

      const users = narrowAdminUserRows(await parseJsonArray(usersRes));
      setUserOptions(
        users
          .filter((u) => u.isActive)
          .map((u) => ({
            id: String(u.id),
            label: u.fullName,
            sublabel: u.usernameEmail,
            searchText: `${u.fullName} ${u.usernameEmail}`,
          }))
      );
    } catch {
      setWorkOrderOptions([]);
      setUserOptions([]);
    } finally {
      setRefsLoading(false);
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
    void fetchCatalog();
    if (tab === "issues") {
      void fetchRefs();
    }
  }, [fetchCatalog, fetchRefs, tab]);

  useEffect(() => {
    if (!showModal || tab !== "issues") return;
    queueMicrotask(() => void fetchRefs());
  }, [showModal, tab, fetchRefs]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const selectedCatalogItem = useMemo(
    () => catalogItems.find((p) => String(p.id) === (tab === "receipts" ? rPartId : iPartId)),
    [catalogItems, tab, rPartId, iPartId]
  );

  const handleReceiptPartChange = useCallback(
    (partId: string) => {
      setRPartId(partId);
      if (!partId || rUnitPrice.trim()) return;
      const item = catalogItems.find((p) => String(p.id) === partId);
      if (item?.purchasePrice) {
        setRUnitPrice(item.purchasePrice);
      }
    },
    [catalogItems, rUnitPrice]
  );

  const handleSaveReceipt = useCallback(async () => {
    const partId = parseInt(rPartId, 10);
    if (!partId || Number.isNaN(partId)) {
      await appAlert({ message: durApiErrors.missing_part_id ?? wDict.receipts.fields.part });
      return;
    }
    const qty = parseFloat(rQuantity);
    if (!rQuantity.trim() || Number.isNaN(qty) || qty <= 0) {
      await appAlert({ message: durApiErrors.invalid_quantity ?? wDict.receipts.fields.quantity });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dur/stock/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          quantity: rQuantity.trim(),
          unitPrice: rUnitPrice.trim() || null,
          invoiceNumber: rInvoiceNumber.trim() || null,
          notes: rNotes.trim() || null,
        }),
      });
      if (res.ok) {
        await appAlert({ message: wDict.receipts.saveSuccess });
        closeModal();
        await fetchData();
        return;
      }
      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      await appAlert({
        message: appDialogApiMessage(
          { ...globalApiErrors, ...durApiErrors },
          code,
          dictionary.apiErrors.save_error
        ),
      });
    } catch {
      await appAlert({ message: dictionary.apiErrors.save_error });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    rPartId,
    rQuantity,
    rUnitPrice,
    rInvoiceNumber,
    rNotes,
    appAlert,
    durApiErrors,
    wDict,
    closeModal,
    fetchData,
    globalApiErrors,
    dictionary.apiErrors.save_error,
  ]);

  const handleSaveIssue = useCallback(async () => {
    const partId = parseInt(iPartId, 10);
    if (!partId || Number.isNaN(partId)) {
      await appAlert({ message: durApiErrors.missing_part_id ?? wDict.issues.fields.part });
      return;
    }
    const qty = parseFloat(iQuantity);
    if (!iQuantity.trim() || Number.isNaN(qty) || qty <= 0) {
      await appAlert({ message: durApiErrors.invalid_quantity ?? wDict.issues.fields.quantity });
      return;
    }

    const available = parseFloat(selectedCatalogItem?.stockQuantity ?? "0");
    if (available < qty) {
      await appAlert({
        message: wDict.issues.insufficientStock
          .replace("{available}", String(available))
          .replace("{unit}", selectedCatalogItem?.unit ?? "szt"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dur/stock/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          quantity: iQuantity.trim(),
          workOrderId: iWorkOrderId ? parseInt(iWorkOrderId, 10) : null,
          issuedTo: iIssuedTo ? parseInt(iIssuedTo, 10) : null,
          notes: iNotes.trim() || null,
        }),
      });
      if (res.ok) {
        await appAlert({ message: wDict.issues.saveSuccess });
        closeModal();
        await fetchData();
        return;
      }
      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      if (code === "insufficient_stock" && selectedCatalogItem) {
        await appAlert({
          message: wDict.issues.insufficientStock
            .replace("{available}", selectedCatalogItem.stockQuantity)
            .replace("{unit}", selectedCatalogItem.unit),
        });
        return;
      }
      await appAlert({
        message: appDialogApiMessage(
          { ...globalApiErrors, ...durApiErrors },
          code,
          dictionary.apiErrors.save_error
        ),
      });
    } catch {
      await appAlert({ message: dictionary.apiErrors.save_error });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    iPartId,
    iQuantity,
    iWorkOrderId,
    iIssuedTo,
    iNotes,
    selectedCatalogItem,
    appAlert,
    durApiErrors,
    wDict,
    closeModal,
    fetchData,
    globalApiErrors,
    dictionary.apiErrors.save_error,
  ]);

  const currentDict = tab === "receipts" ? wDict.receipts : wDict.issues;
  const currentData = tab === "receipts" ? receipts : issues;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {wDict.movementsTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{wDict.movementsSubtitle}</p>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setTab("receipts")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "receipts"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {wDict.receipts.title}
          </button>
          <button
            type="button"
            onClick={() => setTab("issues")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "issues"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {wDict.issues.title}
          </button>
        </div>
        {canMutate && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            {currentDict.add}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-zinc-500">{dictionary.admin.ui.searchNoResults}</div>
      ) : currentData.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <Package className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p>{currentDict.empty}</p>
        </div>
      ) : tab === "receipts" ? (
        <StockReceiptsTable
          receipts={
            receipts as (StockReceipt & {
              partName?: string;
              partCatalogNumber?: string;
              creatorName?: string;
            })[]
          }
          dict={wDict.receipts}
        />
      ) : (
        <StockIssuesTable
          issues={
            issues as (StockIssue & {
              partName?: string;
              partCatalogNumber?: string;
              creatorName?: string;
              workOrderLabel?: string;
            })[]
          }
          dict={wDict.issues}
        />
      )}

      {showModal && (
        <AdminModalShell
          open={showModal}
          title={currentDict.add}
          onClose={closeModal}
          closeOnBackdropClick={false}
          scrollableBody
          footer={
            <FormModalFooter
              formId={tab === "receipts" ? "receipt-form" : "issue-form"}
              onCancel={closeModal}
              submitLabel={
                isSubmitting ? dictionary.dur.spareParts.saving : dictionary.dur.spareParts.save
              }
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
              dict={wDict.receipts.fields}
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
              dict={wDict.issues.fields}
            />
          )}
        </AdminModalShell>
      )}
    </>
  );
}
