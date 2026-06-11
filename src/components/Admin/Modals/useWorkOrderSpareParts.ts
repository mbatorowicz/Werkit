"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { isRecord } from "@/lib/narrowApiListRows";
import { decimalStringForStorage } from "@/lib/decimalInput";
import { useDictionary } from "@/i18n";

// ── Typy lokalne ──

export type WorkOrderSparePartRow = {
  id: number;
  workOrderId: number;
  partId: number;
  partName: string;
  partSku: string;
  quantity: string;
  unitPrice: string | null;
  notes: string | null;
};

type UseWorkOrderSparePartsParams = {
  workOrderId: number | null;
  orderType: string | null;
  resourceGroupId: number | null;
};

export function useWorkOrderSpareParts({
  workOrderId,
  orderType,
  resourceGroupId,
}: UseWorkOrderSparePartsParams) {
  const dict = useDictionary();
  const durDict = dict.dur.workOrderSpareParts;
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
    if (!isRepair || !hasOrderId) return;
    queueMicrotask(() => {
      void fetchParts();
      void fetchCatalog({ resourceGroupId, audience: "admin" });
    });
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
            quantity: decimalStringForStorage(addQuantity || "1") ?? "1",
            unitPrice: addUnitPrice.trim() ? decimalStringForStorage(addUnitPrice) : null,
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
    if (
      !(await appConfirm({
        message: durDict.returnConfirm ?? durDict.removeConfirm,
        variant: "danger",
      }))
    ) {
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

  return {
    parts,
    isLoading,
    isAdding,
    showAddForm,
    setShowAddForm,
    selectedPartId,
    setSelectedPartId,
    addQuantity,
    setAddQuantity,
    addUnitPrice,
    setAddUnitPrice,
    addNotes,
    setAddNotes,
    handleAddPart,
    handleRemovePart,
    catalogItems,
    isRepair,
    hasOrderId,
  };
}
