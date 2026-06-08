"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Package } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { formatDict, useDictionary } from "@/i18n";
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
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import {
  TABLE_BODY_ROW,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TD_STRONG,
  TABLE_TH,
} from "@/lib/uiTable";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
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
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const matWh = dictionary.admin.materials.warehouse;
  const common = dictionary.common;
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
      sublabel: formatDict(wh.stockSublabel, {
        qty: m.stockQuantity ?? "0",
        unit: m.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
      }),
    }));
  }, [materials, wh.stockSublabel]);

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
      await appAlert({ message: wh.movementSaveSuccess });
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
            {wh.movementsTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{matWh.movementsSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={openModal}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {tab === "receipts" ? wh.addReceipt : wh.addIssue}
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

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={matWh.movementsSearchPlaceholder}
      />

      {issueTotalsByMaterial.length > 0 ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="mb-2 font-medium text-emerald-900 dark:text-emerald-200">
            {wh.movementsFilterSummary}
          </p>
          <ul className="space-y-1 text-emerald-800 dark:text-emerald-300">
            {issueTotalsByMaterial.map((item) => (
              <li key={item.materialName}>
                {formatDict(wh.movementsFilterSummaryLine, {
                  item: item.materialName,
                  qty: decimalStringForStorage(String(item.quantity)) ?? String(item.quantity),
                  unit: item.unit,
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AdminTableShell>
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            {tab === "issues" ? <th className={TABLE_TH}>{matWh.colCustomer}</th> : null}
            <th className={TABLE_TH}>{matWh.colMaterial}</th>
            <th className={TABLE_TH}>{wh.colQuantity}</th>
            <th className={TABLE_TH}>{wh.colDate}</th>
            <th className={TABLE_TH}>{wh.colNotes}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={colSpan} className={TABLE_EMPTY_CELL}>
                {common.loading.default}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={TABLE_EMPTY_CELL}>
                {searchQuery.trim()
                  ? common.search.noResultsForQuery
                  : tab === "receipts"
                    ? wh.emptyReceipts
                    : wh.emptyIssues}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className={TABLE_BODY_ROW}>
                {tab === "issues" ? (
                  <td className={TABLE_TD_STRONG}>
                    {"customerName" in row && row.customerName ? row.customerName : "—"}
                  </td>
                ) : null}
                <td className={TABLE_TD_STRONG}>{row.materialName ?? row.materialId}</td>
                <td className={TABLE_TD}>
                  {formatDict(wh.stockWithUnit, {
                    qty: row.quantity,
                    unit:
                      materialById.get(row.materialId)?.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
                  })}
                </td>
                <td className={TABLE_TD_MUTED}>{new Date(row.createdAt).toLocaleString()}</td>
                <td className={TABLE_TD_MUTED}>{row.notes ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTableShell>

      <AdminModalShell
        open={showModal && canMutate}
        onClose={() => setShowModal(false)}
        title={tab === "receipts" ? wh.modalReceiptTitle : wh.modalIssueTitle}
        maxWidthClass="max-w-md"
        closeOnBackdropClick={false}
        footer={
          <FormModalFooter
            formId="material-stock-form"
            onCancel={() => setShowModal(false)}
            isSubmitting={isSubmitting}
            submitLabel={common.actions.save}
            cancelLabel={common.actions.cancel}
          />
        }
      >
        <form id="material-stock-form" onSubmit={handleSubmit} className={`${INVENTORY_FORM_STACK} p-6`}>
          <AdminFormField label={matWh.fieldMaterial} required>
            <AdminSearchCombobox
              options={materialOptions}
              value={materialId}
              onChange={setMaterialId}
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
              onChange={setQuantity}
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
                  onChange={setUnitPrice}
                  placeholder="0"
                  className={INVENTORY_FORM_CONTROL}
                />
              </AdminFormField>
              <AdminFormField label={matWh.fieldInvoice}>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={INVENTORY_FORM_CONTROL}
                />
              </AdminFormField>
            </>
          ) : null}

          <AdminFormField label={matWh.fieldNotes}>
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
