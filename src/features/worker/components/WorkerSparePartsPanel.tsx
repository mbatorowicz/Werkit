"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Package } from "lucide-react";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { useAppDialog } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { LINK_ACCENT } from "@/lib/uiChrome";
import { CARD_PADDED } from "@/lib/uiTokens";
import { FIELD_LABEL_COMPACT } from "@/lib/uiTypography";
import { WorkerSparePartsAddForm } from "@/features/worker/components/WorkerSparePartsAddForm";
import { WorkerSparePartsList } from "@/features/worker/components/WorkerSparePartsList";
import {
  narrowWorkOrderSparePartRows,
  useWorkerSparePartsActions,
  type WorkOrderSparePartRow,
} from "@/features/worker/components/useWorkerSparePartsActions";

type Props = {
  workOrderId: number | null;
  orderType: string | null;
  resourceGroupId: number | null;
  durEnabled?: boolean;
  isDurWorker?: boolean;
};

const LABEL = FIELD_LABEL_COMPACT;

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
  const dict = useDictionary();
  const workerDict = dict.worker.client;
  const durDict = dict.dur.workOrderSpareParts;
  const wh = warehouseCommonLabels(dict);
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
      setParts(narrowWorkOrderSparePartRows(data));
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

  const catalogOptions = durSparePartComboboxOptions(catalogItems, wh.stockSublabel);

  const { handleAddPart, handleReturnPart } = useWorkerSparePartsActions({
    workOrderId,
    resourceGroupId,
    workerDict,
    durDict,
    apiErrors,
    durApiErrors,
    appAlert,
    appConfirm,
    fetchParts,
    fetchCatalog,
    selectedPartId,
    addQuantity,
    addNotes,
    setIsAdding,
    setShowAddForm,
    setSelectedPartId,
    setAddQuantity,
    setAddNotes,
  });

  if (!durEnabled || !isDurWorker || !isRepair) return null;

  return (
    <div className={CARD_PADDED}>
      <div className="mb-3 flex items-center justify-between">
        <label className={LABEL}>
          <Package className="-mt-0.5 mr-1 inline-block h-3.5 w-3.5" />
          {workerDict.spareParts}
        </label>
        {hasOrderId && !showAddForm && (
          <button type="button" onClick={() => setShowAddForm(true)} className={LINK_ACCENT}>
            <Plus className="h-3 w-3" />
            {workerDict.addSparePart}
          </button>
        )}
      </div>

      {!hasOrderId && (
        <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
          {workerDict.saveOrderBeforeSpareParts}
        </p>
      )}

      {showAddForm && hasOrderId && (
        <WorkerSparePartsAddForm
          workerDict={workerDict}
          catalogOptions={catalogOptions}
          selectedPartId={selectedPartId}
          setSelectedPartId={setSelectedPartId}
          addQuantity={addQuantity}
          setAddQuantity={setAddQuantity}
          addNotes={addNotes}
          setAddNotes={setAddNotes}
          isAdding={isAdding}
          onCancel={() => {
            setShowAddForm(false);
            setSelectedPartId("");
            setAddQuantity("1");
            setAddNotes("");
          }}
          onSubmit={() => void handleAddPart()}
        />
      )}

      <WorkerSparePartsList
        isLoading={isLoading}
        parts={parts}
        workerDict={workerDict}
        onReturnPart={(lineId) => void handleReturnPart(lineId)}
      />
    </div>
  );
}
