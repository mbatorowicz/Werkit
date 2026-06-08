"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { formatDict, useDictionary } from "@/i18n";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { narrowStockReceipts, narrowStockIssues } from "@/lib/narrow/dur";
import { narrowAdminUserRows } from "@/lib/narrow/admin";
import { narrowUnifiedGanttItems } from "@/lib/narrow/admin";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import type { StockReceipt, StockIssue } from "@/types/dur";
import { StockReceiptForm } from "./StockReceiptForm";
import { StockIssueForm } from "./StockIssueForm";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";

type Tab = "receipts" | "issues";

export default function StockMovementsClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert } = useAppDialog();

  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const dWh = dictionary.dur.warehouse;
  const common = dictionary.common;
  const issuesDict = dWh.issues;
  const receiptsDict = dWh.receipts;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;
  const globalApiErrors = dictionary.apiErrors as Record<string, string>;

  const [tab, setTab] = useState<Tab>("issues");
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  const partById = useMemo(() => new Map(catalogItems.map((p) => [p.id, p])), [catalogItems]);

  const partOptions = useMemo(
    () => durSparePartComboboxOptions(catalogItems, wh.stockSublabel),
    [catalogItems, wh.stockSublabel]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recRes, issRes] = await Promise.all([
        fetch("/api/dur/stock/receipts", { cache: "no-store" }),
        fetch("/api/dur/stock/issues", { cache: "no-store" }),
      ]);
      setReceipts(narrowStockReceipts(await parseJsonArray(recRes)));
      setIssues(narrowStockIssues(await parseJsonArray(issRes)));
    } catch {
      setReceipts([]);
      setIssues([]);
    }
    setIsLoading(false);
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
    queueMicrotask(() => {
      void fetchData();
      void fetchCatalog();
    });
  }, [fetchData, fetchCatalog]);

  const openModal = useCallback(() => {
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
      await appAlert({ message: durApiErrors.missing_part_id ?? receiptsDict.fields.part });
      return;
    }
    const qty = parseDecimalInput(rQuantity);
    if (!rQuantity.trim() || qty == null || qty <= 0) {
      await appAlert({ message: durApiErrors.invalid_quantity ?? receiptsDict.fields.quantity });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dur/stock/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          quantity: decimalStringForStorage(rQuantity) ?? rQuantity.trim(),
          unitPrice: rUnitPrice.trim() ? decimalStringForStorage(rUnitPrice) : null,
          invoiceNumber: rInvoiceNumber.trim() || null,
          notes: rNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        await fetchData();
        await fetchCatalog();
        await appAlert({ message: wh.movementSaveSuccess });
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
    receiptsDict.fields,
    fetchData,
    fetchCatalog,
    globalApiErrors,
    dictionary.apiErrors.save_error,
    wh.movementSaveSuccess,
  ]);

  const handleSaveIssue = useCallback(async () => {
    const partId = parseInt(iPartId, 10);
    if (!partId || Number.isNaN(partId)) {
      await appAlert({ message: durApiErrors.missing_part_id ?? issuesDict.fields.part });
      return;
    }
    const qty = parseDecimalInput(iQuantity);
    if (!iQuantity.trim() || qty == null || qty <= 0) {
      await appAlert({ message: durApiErrors.invalid_quantity ?? issuesDict.fields.quantity });
      return;
    }

    const available = parseDecimalInput(selectedCatalogItem?.stockQuantity ?? "0") ?? 0;
    if (available < qty) {
      await appAlert({
        message: issuesDict.insufficientStock
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
          quantity: decimalStringForStorage(iQuantity) ?? iQuantity.trim(),
          workOrderId: iWorkOrderId ? parseInt(iWorkOrderId, 10) : null,
          issuedTo: iIssuedTo ? parseInt(iIssuedTo, 10) : null,
          notes: iNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        await fetchData();
        await fetchCatalog();
        await appAlert({ message: wh.movementSaveSuccess });
        return;
      }
      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      if (code === "insufficient_stock" && selectedCatalogItem) {
        await appAlert({
          message: issuesDict.insufficientStock
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
    issuesDict,
    fetchData,
    fetchCatalog,
    globalApiErrors,
    dictionary.apiErrors.save_error,
    wh.movementSaveSuccess,
  ]);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return receipts;
    return receipts.filter((row) => {
      const haystack = [
        row.partName,
        row.partCatalogNumber,
        row.notes,
        row.invoiceNumber,
        row.quantity,
        new Date(row.createdAt).toLocaleString(),
      ]
        .filter(Boolean)
        .join(" ");
      return matchesSearchQuery(haystack, q);
    });
  }, [receipts, searchQuery]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return issues;
    return issues.filter((row) => {
      const haystack = [
        row.issuedToName,
        row.resourceName,
        row.partName,
        row.partCatalogNumber,
        row.notes,
        row.workOrderLabel,
        row.workOrderId != null ? `#${row.workOrderId}` : null,
        row.quantity,
        new Date(row.createdAt).toLocaleString(),
      ]
        .filter(Boolean)
        .join(" ");
      return matchesSearchQuery(haystack, q);
    });
  }, [issues, searchQuery]);

  const issueTotalsByPart = useMemo(() => {
    if (tab !== "issues" || !searchQuery.trim() || filteredIssues.length === 0) return [];
    const totals = new Map<number, { partName: string; quantity: number; unit: string }>();
    for (const row of filteredIssues) {
      const qty = parseDecimalInput(row.quantity) ?? 0;
      const unit = partById.get(row.partId)?.unit ?? "szt";
      const existing = totals.get(row.partId);
      if (existing) {
        existing.quantity += qty;
      } else {
        totals.set(row.partId, {
          partName: row.partName ?? String(row.partId),
          quantity: qty,
          unit,
        });
      }
    }
    return [...totals.values()].sort((a, b) => a.partName.localeCompare(b.partName, "pl"));
  }, [tab, searchQuery, filteredIssues, partById]);

  const rows = tab === "receipts" ? filteredReceipts : filteredIssues;
  const colSpan = tab === "issues" ? 6 : 4;

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

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
            <tr>
              {tab === "issues" ? (
                <>
                  <th className="px-4 py-3 font-semibold text-zinc-500">{dWh.colCollectedBy}</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500">{dWh.colResource}</th>
                </>
              ) : null}
              <th className="px-4 py-3 font-semibold text-zinc-500">{dWh.colPart}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wh.colQuantity}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wh.colDate}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wh.colNotes}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-zinc-500">
                  {common.loading.default}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-zinc-500">
                  {searchQuery.trim()
                    ? common.search.noResultsForQuery
                    : tab === "receipts"
                      ? wh.emptyReceipts
                      : wh.emptyIssues}
                </td>
              </tr>
            ) : tab === "receipts" ? (
              filteredReceipts.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{row.partName ?? row.partId}</td>
                  <td className="px-4 py-3">
                    {formatDict(wh.stockWithUnit, {
                      qty: row.quantity,
                      unit: partById.get(row.partId)?.unit ?? "szt",
                    })}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{row.notes ?? "—"}</td>
                </tr>
              ))
            ) : (
              filteredIssues.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{row.issuedToName ?? "—"}</td>
                  <td className="px-4 py-3">{row.resourceName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{row.partName ?? row.partId}</td>
                  <td className="px-4 py-3">
                    {formatDict(wh.stockWithUnit, {
                      qty: row.quantity,
                      unit: partById.get(row.partId)?.unit ?? "szt",
                    })}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{row.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
