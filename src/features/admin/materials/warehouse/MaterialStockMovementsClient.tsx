"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Package } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { formatDict, getDictionary } from "@/i18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { materialsApi } from "@/lib/appRoutes";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminFormField } from "@/components/Admin/AdminFormField";
import {
  INVENTORY_FORM_CONTROL,
  INVENTORY_FORM_STACK,
  INVENTORY_FORM_TEXTAREA,
} from "@/components/Admin/adminInventoryFormStyles";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminSearchCombobox, type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { DecimalInput } from "@/components/DecimalInput";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import {
  narrowMaterialStockIssues,
  narrowMaterialStockReceipts,
} from "@/lib/narrow/materials-warehouse";
import type { MaterialStockIssue, MaterialStockReceipt } from "@/types/materials-warehouse";
import type { MaterialRow } from "@/features/admin/materials/types";

type Tab = "receipts" | "issues";

type Props = {
  materials: MaterialRow[];
  onRefreshMaterials: () => void;
};

export function MaterialStockMovementsClient({ materials, onRefreshMaterials }: Props) {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert } = useAppDialog();
  const dictionary = getDictionary();
  const wDict = dictionary.admin.materials.warehouse;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const comboboxCommon = comboboxFeedbackProps(dictionary.admin.orders);

  const [tab, setTab] = useState<Tab>("issues");
  const [receipts, setReceipts] = useState<MaterialStockReceipt[]>([]);
  const [issues, setIssues] = useState<MaterialStockIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const materialById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );

  const selectedMaterial = useMemo(
    () => materials.find((m) => String(m.id) === materialId) ?? null,
    [materials, materialId]
  );

  const materialOptions = useMemo((): AdminSearchComboboxOption[] => {
    return materials.map((m) => ({
      id: String(m.id),
      label: m.name,
      sublabel: formatDict(wDict.stockSublabel, {
        qty: m.stockQuantity ?? "0",
        unit: m.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
      }),
    }));
  }, [materials, wDict.stockSublabel]);

  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rRes, iRes] = await Promise.all([
        fetch(materialsApi.stockReceipts, { cache: "no-store" }),
        fetch(materialsApi.stockIssues, { cache: "no-store" }),
      ]);
      setReceipts(narrowMaterialStockReceipts(await parseJsonArray(rRes)));
      setIssues(narrowMaterialStockIssues(await parseJsonArray(iRes)));
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadMovements());
  }, [loadMovements]);

  function openModal() {
    setMaterialId("");
    setQuantity("");
    setUnitPrice("");
    setInvoiceNumber("");
    setNotes("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mid = parseInt(materialId, 10);
    const qty = parseDecimalInput(quantity);
    if (!mid || Number.isNaN(mid) || qty == null || qty <= 0) {
      await appAlert({ message: apiErrors.invalid_quantity });
      return;
    }
    setIsSubmitting(true);
    try {
      const url = tab === "receipts" ? materialsApi.stockReceipts : materialsApi.stockIssues;
      const body =
        tab === "receipts"
          ? {
              materialId: mid,
              quantity: decimalStringForStorage(quantity) ?? String(qty),
              unitPrice: unitPrice.trim() || undefined,
              invoiceNumber: invoiceNumber.trim() || undefined,
              notes: notes.trim() || undefined,
            }
          : {
              materialId: mid,
              quantity: decimalStringForStorage(quantity) ?? String(qty),
              notes: notes.trim() || undefined,
            };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await parseJsonUnknown(res);
      const code = readApiErrorString(parsed);
      if (!res.ok) {
        await appAlert({ message: appDialogApiMessage(apiErrors, code, apiErrors.save_error) });
        return;
      }
      setShowModal(false);
      await loadMovements();
      onRefreshMaterials();
      await appAlert({ message: wDict.saveSuccess });
    } catch {
      await appAlert({ message: apiErrors.fetch_error });
    }
    setIsSubmitting(false);
  }

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return receipts;
    return receipts.filter((row) => {
      const haystack = [
        row.materialName,
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
        row.materialName,
        row.customerName,
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

  const issueTotalsByMaterial = useMemo(() => {
    if (tab !== "issues" || !searchQuery.trim() || filteredIssues.length === 0) return [];
    const totals = new Map<number, { materialName: string; quantity: number; unit: string }>();
    for (const row of filteredIssues) {
      const qty = parseDecimalInput(row.quantity) ?? 0;
      const unit = materialById.get(row.materialId)?.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT;
      const existing = totals.get(row.materialId);
      if (existing) {
        existing.quantity += qty;
      } else {
        totals.set(row.materialId, {
          materialName: row.materialName ?? String(row.materialId),
          quantity: qty,
          unit,
        });
      }
    }
    return [...totals.values()].sort((a, b) => a.materialName.localeCompare(b.materialName, "pl"));
  }, [tab, searchQuery, filteredIssues, materialById]);

  const rows = tab === "receipts" ? filteredReceipts : filteredIssues;
  const colSpan = tab === "issues" ? 5 : 4;

  return (
    <section className="border-t border-zinc-200 pt-12 dark:border-zinc-800/80">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-white">
            <Package className="h-6 w-6 text-emerald-500" />
            {wDict.movementsTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{wDict.movementsSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={openModal}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {tab === "receipts" ? wDict.addReceipt : wDict.addIssue}
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("issues")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "issues"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {wDict.tabIssues}
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
          {wDict.tabReceipts}
        </button>
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={wDict.movementsSearchPlaceholder}
      />

      {issueTotalsByMaterial.length > 0 ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="mb-2 font-medium text-emerald-900 dark:text-emerald-200">
            {wDict.movementsFilterSummary}
          </p>
          <ul className="space-y-1 text-emerald-800 dark:text-emerald-300">
            {issueTotalsByMaterial.map((item) => (
              <li key={item.materialName}>
                {formatDict(wDict.movementsFilterSummaryLine, {
                  material: item.materialName,
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
                <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colCustomer}</th>
              ) : null}
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colMaterial}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colQuantity}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colDate}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colNotes}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-zinc-500">
                  {wDict.loading}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-zinc-500">
                  {searchQuery.trim()
                    ? wDict.movementsSearchNoResults
                    : tab === "receipts"
                      ? wDict.emptyReceipts
                      : wDict.emptyIssues}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  {tab === "issues" ? (
                    <td className="px-4 py-3 font-medium">
                      {"customerName" in row && row.customerName ? row.customerName : "—"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-medium">{row.materialName ?? row.materialId}</td>
                  <td className="px-4 py-3">
                    {formatDict(wDict.stockWithUnit, {
                      qty: row.quantity,
                      unit:
                        materialById.get(row.materialId)?.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
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
        title={tab === "receipts" ? wDict.modalReceiptTitle : wDict.modalIssueTitle}
        maxWidthClass="max-w-md"
        closeOnBackdropClick={false}
        footer={
          <FormModalFooter
            formId="material-stock-form"
            onCancel={() => setShowModal(false)}
            isSubmitting={isSubmitting}
            submitLabel={wDict.save}
            cancelLabel={wDict.cancel}
          />
        }
      >
        <form id="material-stock-form" onSubmit={handleSubmit} className={`${INVENTORY_FORM_STACK} p-6`}>
          <AdminFormField label={wDict.fieldMaterial} required>
            <AdminSearchCombobox
              options={materialOptions}
              value={materialId}
              onChange={setMaterialId}
              placeholder={wDict.fieldMaterialPlaceholder}
              aria-label={wDict.fieldMaterial}
              required
              {...comboboxCommon}
            />
          </AdminFormField>

          <AdminFormField
            label={
              selectedMaterial
                ? formatDict(wDict.fieldQuantityWithUnit, {
                    unit: selectedMaterial.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
                  })
                : wDict.fieldQuantity
            }
            required
          >
            <DecimalInput
              value={quantity}
              onChange={setQuantity}
              placeholder="0"
              className={INVENTORY_FORM_CONTROL}
              required
            />
          </AdminFormField>

          {tab === "receipts" ? (
            <>
              <AdminFormField label={wDict.fieldUnitPrice}>
                <DecimalInput
                  value={unitPrice}
                  onChange={setUnitPrice}
                  placeholder="0"
                  className={INVENTORY_FORM_CONTROL}
                />
              </AdminFormField>
              <AdminFormField label={wDict.fieldInvoice}>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={INVENTORY_FORM_CONTROL}
                />
              </AdminFormField>
            </>
          ) : null}

          <AdminFormField label={wDict.fieldNotes}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={INVENTORY_FORM_TEXTAREA}
            />
          </AdminFormField>
        </form>
      </AdminModalShell>
    </section>
  );
}
