"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";
import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { isRecord } from "@/lib/narrowApiListRows";
import { getDictionary } from "@/i18n";

// ── Lokalne typy ──

type WorkOrderSparePartRow = {
  id: number;
  partName: string;
  partSku: string;
  quantity: string;
  unitPrice: string | null;
  notes: string | null;
};

type SparePartOption = {
  id: number;
  name: string;
  catalogNumber: string;
  unit: string;
  stockQuantity: string;
};

type Props = {
  /** ID zlecenia naprawy — wymagane do pobrania / dodawania części. */
  workOrderId: number | null;
  /** Typ zlecenia — sekcja widoczna tylko dla machine_repair. */
  orderType: string | null;
  /** ID grupy maszyn (typ zasobu) — filtruje katalog części kompatybilnych z tą grupą. */
  resourceGroupId: number | null;
};

const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const CONTROL =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none";

/**
 * Panel części zamiennych dla aktywnej sesji pracownika (wydanie z magazynu).
 * Widoczny tylko gdy orderType === 'machine_repair' i workOrderId !== null.
 */
export default function WorkerSparePartsPanel({ workOrderId, orderType, resourceGroupId }: Props) {
  const dict = getDictionary();
  const workerDict = dict.worker.client;
  const apiErrors = dict.apiErrors as Record<string, string>;
  const { alert: appAlert } = useAppDialog();

  const [parts, setParts] = useState<WorkOrderSparePartRow[]>([]);
  const [catalog, setCatalog] = useState<SparePartOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Pola formularza dodawania
  const [selectedPartId, setSelectedPartId] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");
  const [addNotes, setAddNotes] = useState("");

  const isRepair = orderType === "machine_repair";
  const hasOrderId = workOrderId != null && workOrderId > 0;

  // ── Fetch istniejących części ──
  const fetchParts = useCallback(async () => {
    if (!workOrderId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: spare-parts GET work-order ${workOrderId}`,
        `/api/worker/work-orders/${workOrderId}/spare-parts`,
        undefined,
        { category: "orders" }
      );
      if (!res.ok) return;
      const data = await parseJsonArray(res);
      const rows: WorkOrderSparePartRow[] = [];
      for (const item of data) {
        if (isRecord(item)) {
          rows.push({
            id: typeof item.id === "number" ? item.id : 0,
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

  // ── Fetch katalogu części (filtrowany po kategorii maszyny) ──
  const fetchCatalog = useCallback(async () => {
    try {
      const url =
        resourceGroupId != null
          ? `/api/dur/spare-parts?compatibleWithResourceGroupId=${resourceGroupId}`
          : "/api/dur/spare-parts";
      const res = await fetchWithDeviceTelemetry(
        "Worker: spare-parts catalog GET",
        url,
        undefined,
        { category: "orders" }
      );
      if (!res.ok) return;
      const data = await parseJsonArray(res);
      const opts: SparePartOption[] = [];
      for (const item of data) {
        if (isRecord(item) && typeof item.id === "number" && typeof item.name === "string") {
          opts.push({
            id: item.id,
            name: item.name,
            catalogNumber: typeof item.catalogNumber === "string" ? item.catalogNumber : "",
            unit: typeof item.unit === "string" ? item.unit : "szt",
            stockQuantity: typeof item.stockQuantity === "string" ? item.stockQuantity : "0",
          });
        }
      }
      setCatalog(opts);
    } catch {
      /* ignore */
    }
  }, [resourceGroupId]);

  useEffect(() => {
    if (isRepair && hasOrderId) {
      void fetchParts();
      void fetchCatalog();
    }
  }, [isRepair, hasOrderId, fetchParts, fetchCatalog]);

  // ── Dodawanie części (wydanie z magazynu) ──
  const handleAddPart = async () => {
    const partIdNum = parseInt(selectedPartId, 10);
    if (!partIdNum || Number.isNaN(partIdNum)) return;
    if (!workOrderId) return;

    setIsAdding(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: spare-parts POST work-order ${workOrderId}`,
        `/api/worker/work-orders/${workOrderId}/spare-parts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partId: partIdNum,
            quantity: addQuantity || "1",
            notes: addNotes || null,
          }),
        },
        { category: "orders" }
      );

      if (res.ok) {
        await appAlert({ message: workerDict.spareParts ?? "Część została dodana." });
        setShowAddForm(false);
        setSelectedPartId("");
        setAddQuantity("1");
        setAddNotes("");
        await fetchParts();
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({
          message: appDialogApiMessage(apiErrors, code, "Nie udało się dodać części."),
        });
      }
    } catch {
      await appAlert({ message: "Nie udało się dodać części." });
    } finally {
      setIsAdding(false);
    }
  };

  // ── Usuwanie części ──
  const handleRemovePart = async (partId: number) => {
    if (!workOrderId) return;
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: spare-parts DELETE work-order ${workOrderId} part ${partId}`,
        `/api/worker/work-orders/${workOrderId}/spare-parts/${partId}`,
        { method: "DELETE" },
        { category: "orders" }
      );

      if (res.ok) {
        await appAlert({ message: "Część została usunięta." });
        await fetchParts();
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({
          message: appDialogApiMessage(apiErrors, code, "Nie udało się usunąć części."),
        });
      }
    } catch {
      await appAlert({ message: "Nie udało się usunąć części." });
    }
  };

  // ── Opcje comboboxa ──
  const catalogOptions: AdminSearchComboboxOption[] = useMemo(
    () =>
      catalog.map((p) => ({
        id: String(p.id),
        label: p.name,
        sublabel: p.catalogNumber
          ? `${p.catalogNumber} (stan: ${p.stockQuantity} ${p.unit})`
          : undefined,
      })),
    [catalog]
  );

  const comboboxCommon = comboboxFeedbackProps(workerDict);

  if (!isRepair) return null;

  return (
    <div className="w-full bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <label className={LABEL}>
          <Package className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
          {workerDict.spareParts}
        </label>
        {hasOrderId && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition"
          >
            <Plus className="h-3 w-3" />
            {workerDict.addSparePart}
          </button>
        )}
      </div>

      {/* Komunikat gdy brak ID zlecenia */}
      {!hasOrderId && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
          Zlecenie nie zostało jeszcze zapisane.
        </p>
      )}

      {/* Formularz dodawania */}
      {showAddForm && hasOrderId && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {workerDict.choosePart}
            </label>
            <AdminSearchCombobox
              options={catalogOptions}
              value={selectedPartId}
              onChange={setSelectedPartId}
              placeholder={workerDict.choosePart}
              required
              aria-label={workerDict.choosePart}
              {...comboboxCommon}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {workerDict.partQuantity}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                placeholder={workerDict.quantityPlaceholder}
                className={CONTROL}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {workerDict.partNotes}
              </label>
              <input
                type="text"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder={workerDict.sparePartNotesPlaceholder}
                className={CONTROL}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setSelectedPartId("");
                setAddQuantity("1");
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
              {isAdding ? "Dodawanie..." : workerDict.addSparePart}
            </button>
          </div>
        </div>
      )}

      {/* Lista części */}
      {isLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Wczytywanie...</p>
      ) : parts.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{workerDict.noSpareParts}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                  {workerDict.partName}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                  {workerDict.partQuantity}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                  {workerDict.partNotes}
                </th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-500 dark:text-zinc-400">
                  {workerDict.removeSparePart}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {parts.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">
                    {p.partName}
                    {p.partSku ? (
                      <span className="ml-1 text-zinc-400 dark:text-zinc-500">({p.partSku})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-900 dark:text-white">
                    {p.quantity}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{p.notes ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePart(p.id)}
                      className="text-red-500 hover:text-red-400 transition"
                      title={workerDict.removeSparePart}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
