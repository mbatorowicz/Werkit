"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { isRecord } from "@/lib/narrowApiListRows";
import { getDictionary } from "@/i18n";

// ── Typy lokalne ──

type WorkOrderSparePartRow = {
  id: number;
  workOrderId: number;
  partId: number;
  partName: string;
  partSku: string;
  quantity: string;
  unitPrice: string | null;
  notes: string | null;
};

type Props = {
  workOrderId: number | null;
  /** Gdy `null` — zlecenie nie zostało jeszcze zapisane, sekcja nieaktywna. */
  orderType: string | null;
  /** ID kategorii maszyny — filtruje katalog części tylko do kompatybilnych z tą maszyną. */
  resourceGroupId: number | null;
};

const FIELD = "space-y-1.5";
const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const CONTROL =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none";

/**
 * Sekcja części zamiennych w formularzu zlecenia naprawczego (admin).
 * Widoczna tylko gdy orderType === 'machine_repair' i workOrderId !== null.
 */
export default function WorkOrderSparePartsSection({ workOrderId, orderType, resourceGroupId }: Props) {
  const dict = getDictionary();
  const durDict = dict.dur.workOrderSpareParts;
  const adminOrdersDict = dict.admin.orders;
  const apiErrors = dict.apiErrors as Record<string, string>;
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const { items: catalogItems, fetchCatalog } = useDurSparePartCatalog();
  const refreshCatalog = useCallback(
    () => fetchCatalog({ resourceGroupId, audience: "admin" }),
    [fetchCatalog, resourceGroupId]
  );

  const [parts, setParts] = useState<WorkOrderSparePartRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Pola formularza dodawania
  const [selectedPartId, setSelectedPartId] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");
  const [addUnitPrice, setAddUnitPrice] = useState("");
  const [addNotes, setAddNotes] = useState("");

  const isRepair = orderType === "machine_repair";
  const hasOrderId = workOrderId != null && workOrderId > 0;

  // ── Fetch istniejących części ──
  const fetchParts = useCallback(async () => {
    if (!workOrderId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Admin: spare-parts GET work-order ${workOrderId}`,
        `/api/admin/work-orders/${workOrderId}/spare-parts`,
        undefined,
        { category: "admin" }
      );
      if (!res.ok) return;
      const data = await parseJsonArray(res);
      const rows: WorkOrderSparePartRow[] = [];
      for (const item of data) {
        if (isRecord(item)) {
          rows.push({
            id: typeof item.id === "number" ? item.id : 0,
            workOrderId: typeof item.workOrderId === "number" ? item.workOrderId : workOrderId,
            partId: typeof item.partId === "number" ? item.partId : 0,
            partName: typeof item.partName === "string" ? item.partName : "",
            partSku: typeof item.partSku === "string" ? item.partSku : "",
            quantity: typeof item.quantity === "string" ? item.quantity : "1",
            unitPrice: typeof item.unitPrice === "string" ? item.unitPrice : null,
            notes: typeof item.notes === "string" ? item.notes : null,
          });
        }
      }
      setParts(rows);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    if (isRepair && hasOrderId) {
      void fetchParts();
      void fetchCatalog({ resourceGroupId, audience: "admin" });
    }
  }, [isRepair, hasOrderId, fetchParts, fetchCatalog, resourceGroupId]);

  // ── Dodawanie części ──
  const handleAddPart = async () => {
    const partIdNum = parseInt(selectedPartId, 10);
    if (!partIdNum || Number.isNaN(partIdNum)) return;
    if (!workOrderId) return;

    setIsAdding(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Admin: spare-parts POST work-order ${workOrderId}`,
        `/api/admin/work-orders/${workOrderId}/spare-parts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partId: partIdNum,
            quantity: addQuantity || "1",
            unitPrice: addUnitPrice || null,
            notes: addNotes || null,
          }),
        },
        { category: "admin" }
      );

      if (res.ok) {
        await appAlert({ message: durDict.pickSuccess ?? durDict.saveSuccess });
        setShowAddForm(false);
        setSelectedPartId("");
        setAddQuantity("1");
        setAddUnitPrice("");
        setAddNotes("");
        await fetchParts();
        await refreshCatalog();
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, durDict.saveError) });
      }
    } catch {
      await appAlert({ message: durDict.saveError });
    } finally {
      setIsAdding(false);
    }
  };

  // ── Usuwanie części ──
  const handleRemovePart = async (partId: number) => {
    if (!workOrderId) return;
    if (!(await appConfirm({ message: durDict.returnConfirm ?? durDict.removeConfirm, variant: "danger" }))) {
      return;
    }
    try {
      const res = await fetchWithDeviceTelemetry(
        `Admin: spare-parts DELETE work-order ${workOrderId} part ${partId}`,
        `/api/admin/work-orders/${workOrderId}/spare-parts/${partId}`,
        { method: "DELETE" },
        { category: "admin" }
      );

      if (res.ok) {
        await appAlert({ message: durDict.returnSuccess ?? durDict.removeSuccess });
        await fetchParts();
        await refreshCatalog();
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, durDict.saveError) });
      }
    } catch {
      await appAlert({ message: durDict.saveError });
    }
  };

  // ── Opcje comboboxa ──
  const catalogOptions: AdminSearchComboboxOption[] = useMemo(
    () =>
      durSparePartComboboxOptions(catalogItems, dict.dur.warehouse.partStockSublabel),
    [catalogItems, dict.dur.warehouse.partStockSublabel]
  );

  // ── Render ──
  if (!isRepair) return null;

  return (
    <div className={FIELD}>
      <div className="flex items-center justify-between">
        <label className={LABEL}>
          <Package className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
          {adminOrdersDict.spareParts}
        </label>
        {hasOrderId && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition"
          >
            <Plus className="h-3 w-3" />
            {adminOrdersDict.addSparePart}
          </button>
        )}
      </div>

      {/* Komunikat gdy brak ID zlecenia (przed zapisem) */}
      {!hasOrderId && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
          Zapisz zlecenie przed dodaniem części.
        </p>
      )}

      {/* Formularz dodawania */}
      {showAddForm && hasOrderId && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {durDict.fields.part}
            </label>
            <SparePartSearchField
              options={catalogOptions}
              value={selectedPartId}
              onChange={setSelectedPartId}
              placeholder={durDict.fields.partPlaceholder}
              required
              aria-label={durDict.fields.part}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {durDict.fields.quantity}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                placeholder={durDict.fields.quantityPlaceholder}
                className={CONTROL}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {durDict.fields.unitPrice}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={addUnitPrice}
                onChange={(e) => setAddUnitPrice(e.target.value)}
                placeholder={durDict.fields.unitPricePlaceholder}
                className={CONTROL}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {durDict.fields.notes}
            </label>
            <input
              type="text"
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              placeholder={durDict.fields.notesPlaceholder}
              className={CONTROL}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setSelectedPartId("");
                setAddQuantity("1");
                setAddUnitPrice("");
                setAddNotes("");
              }}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
            >
              Anuluj
            </button>
            <button
              type="button"
              disabled={!selectedPartId || isAdding}
              onClick={handleAddPart}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? adminOrdersDict.saving : adminOrdersDict.addSparePart}
            </button>
          </div>
        </div>
      )}

      {/* Lista części */}
      {isLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Wczytywanie...</p>
      ) : parts.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{durDict.empty}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.name}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.catalogNumber}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.quantity}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.unitPrice}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.totalPrice}
                </th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {parts.map((p) => {
                const qty = parseFloat(p.quantity) || 0;
                const price = parseFloat(p.unitPrice ?? "0") || 0;
                const total = qty * price;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">
                      {p.partName}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{p.partSku}</td>
                    <td className="px-3 py-2 text-right text-zinc-900 dark:text-white">
                      {p.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                      {p.unitPrice ? `${p.unitPrice} zł` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-white">
                      {total > 0 ? `${total.toFixed(2)} zł` : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePart(p.id)}
                        className="text-red-500 hover:text-red-400 transition"
                        title={durDict.returnPart ?? durDict.removePart}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Podsumowanie */}
          {parts.length > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">
                {durDict.totals.partsCount.replace("{count}", String(parts.length))}
              </span>
              {(() => {
                const totalValue = parts.reduce((sum, p) => {
                  const qty = parseFloat(p.quantity) || 0;
                  const price = parseFloat(p.unitPrice ?? "0") || 0;
                  return sum + qty * price;
                }, 0);
                return totalValue > 0 ? (
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {durDict.totals.totalValue.replace("{value}", `${totalValue.toFixed(2)} zł`)}
                  </span>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
