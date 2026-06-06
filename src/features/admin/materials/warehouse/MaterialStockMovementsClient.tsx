"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Package } from "lucide-react";
import { formatDict, getDictionary } from "@/i18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { materialsApi } from "@/lib/appRoutes";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminSearchCombobox, type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { DecimalInput } from "@/components/DecimalInput";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
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

  const [tab, setTab] = useState<Tab>("receipts");
  const [receipts, setReceipts] = useState<MaterialStockReceipt[]>([]);
  const [issues, setIssues] = useState<MaterialStockIssue[]>([]);
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

  const rows = tab === "receipts" ? receipts : issues;

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
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Plus className="h-4 w-4" />
            {tab === "receipts" ? wDict.addReceipt : wDict.addIssue}
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
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
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
            <tr>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colMaterial}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colQuantity}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colDate}</th>
              <th className="px-4 py-3 font-semibold text-zinc-500">{wDict.colNotes}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  {wDict.loading}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  {tab === "receipts" ? wDict.emptyReceipts : wDict.emptyIssues}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
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
        <form id="material-stock-form" onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500">{wDict.fieldMaterial}</label>
            <AdminSearchCombobox
              options={materialOptions}
              value={materialId}
              onChange={setMaterialId}
              placeholder={wDict.fieldMaterialPlaceholder}
              aria-label={wDict.fieldMaterial}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500">
              {selectedMaterial
                ? formatDict(wDict.fieldQuantityWithUnit, {
                    unit: selectedMaterial.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
                  })
                : wDict.fieldQuantity}
            </label>
            <DecimalInput value={quantity} onChange={setQuantity} placeholder="0" />
          </div>
          {tab === "receipts" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500">{wDict.fieldUnitPrice}</label>
                <DecimalInput value={unitPrice} onChange={setUnitPrice} placeholder="" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500">{wDict.fieldInvoice}</label>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500">{wDict.fieldNotes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </form>
      </AdminModalShell>
    </section>
  );
}
