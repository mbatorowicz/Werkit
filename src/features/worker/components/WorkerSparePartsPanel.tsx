"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { isRecord } from "@/lib/narrowApiListRows";
import { DecimalInput } from "@/components/DecimalInput";
import { decimalStringForStorage } from "@/lib/decimalInput";
import { getDictionary } from "@/i18n";

type WorkOrderSparePartRow = {
  id: number;
  partName: string;
  partSku: string;
  quantity: string;
  unitPrice: string | null;
  notes: string | null;
};

type Props = {
  workOrderId: number | null;
  orderType: string | null;
  resourceGroupId: number | null;
  durEnabled?: boolean;
  isDurWorker?: boolean;
};

const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const CONTROL =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none";

/**
 * Panel części zamiennych dla aktywnej sesji pracownika.
 * Pobranie = automatyczne WZ; zwrot = PZ i usunięcie z zlecenia.
 */
export default function WorkerSparePartsPanel({
  workOrderId,
  orderType,
  resourceGroupId,
  durEnabled = false,
  isDurWorker = false,
}: Props) {
  const dict = getDictionary();
  const workerDict = dict.worker.client;
  const durDict = dict.dur.workOrderSpareParts;
  const wDict = dict.dur.warehouse;
  const durApiErrors = dict.dur.apiErrors as Record<string, string>;
  const apiErrors = dict.apiErrors as Record<string, string>;
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const { items: catalogItems, fetchCatalog } = useDurSparePartCatalog();

  const [parts, setParts] = useState<WorkOrderSparePartRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [selectedPartId, setSelectedPartId] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");
  const [addNotes, setAddNotes] = useState("");

  const isRepair = orderType === "machine_repair";
  const hasOrderId = workOrderId != null && workOrderId > 0;

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

  useEffect(() => {
    if (!isRepair || !hasOrderId) return;
    queueMicrotask(() => {
      void fetchParts();
      void fetchCatalog({ resourceGroupId, audience: "worker" });
    });
  }, [isRepair, hasOrderId, fetchParts, fetchCatalog, resourceGroupId]);

  const catalogOptions = durSparePartComboboxOptions(catalogItems, wDict.partStockSublabel);

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
            quantity: decimalStringForStorage(addQuantity || "1") ?? "1",
            notes: addNotes || null,
          }),
        },
        { category: "orders" }
      );

      if (res.ok) {
        await appAlert({ message: workerDict.pickPartSuccess });
        setShowAddForm(false);
        setSelectedPartId("");
        setAddQuantity("1");
        setAddNotes("");
        await fetchParts();
        await fetchCatalog({ resourceGroupId, audience: "worker" });
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({
          message: appDialogApiMessage(
            { ...apiErrors, ...durApiErrors },
            code,
            workerDict.insufficientStock ?? durDict.saveError
          ),
        });
      }
    } catch {
      await appAlert({ message: durDict.saveError });
    } finally {
      setIsAdding(false);
    }
  };

  const handleReturnPart = async (lineId: number) => {
    if (!workOrderId) return;
    if (!(await appConfirm({ message: workerDict.returnPartConfirm, variant: "danger" }))) {
      return;
    }
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: spare-parts DELETE work-order ${workOrderId} line ${lineId}`,
        `/api/worker/work-orders/${workOrderId}/spare-parts/${lineId}`,
        { method: "DELETE" },
        { category: "orders" }
      );

      if (res.ok) {
        await appAlert({ message: workerDict.returnPartSuccess });
        await fetchParts();
        await fetchCatalog({ resourceGroupId, audience: "worker" });
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({
          message: appDialogApiMessage(apiErrors, code, durDict.saveError),
        });
      }
    } catch {
      await appAlert({ message: durDict.saveError });
    }
  };

  if (!durEnabled || !isDurWorker || !isRepair) return null;

  return (
    <div className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
      <div className="mb-3 flex items-center justify-between">
        <label className={LABEL}>
          <Package className="-mt-0.5 mr-1 inline-block h-3.5 w-3.5" />
          {workerDict.spareParts}
        </label>
        {hasOrderId && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 transition hover:text-emerald-500"
          >
            <Plus className="h-3 w-3" />
            {workerDict.addSparePart}
          </button>
        )}
      </div>

      {!hasOrderId && (
        <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
          Zlecenie nie zostało jeszcze zapisane.
        </p>
      )}

      {showAddForm && hasOrderId && (
        <div className="mb-3 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {workerDict.choosePart}
            </label>
            <SparePartSearchField
              options={catalogOptions}
              value={selectedPartId}
              onChange={setSelectedPartId}
              placeholder={workerDict.choosePart}
              required
              aria-label={workerDict.choosePart}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {workerDict.partQuantity}
              </label>
              <DecimalInput
                value={addQuantity}
                onChange={setAddQuantity}
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
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Anuluj
            </button>
            <button
              type="button"
              disabled={!selectedPartId || isAdding}
              onClick={() => void handleAddPart()}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding ? "…" : workerDict.addSparePart}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Wczytywanie…</p>
      ) : parts.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{workerDict.noSpareParts}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {p.partName}
                </p>
                <p className="text-xs text-zinc-500">
                  {p.partSku} · {p.quantity}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleReturnPart(p.id)}
                className="shrink-0 text-amber-600 transition hover:text-amber-500"
                title={workerDict.removeSparePart}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
