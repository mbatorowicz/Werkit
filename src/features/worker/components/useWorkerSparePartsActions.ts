"use client";

import type { AppAlertOptions, AppConfirmOptions } from "@/components/AppDialogProvider";
import { appDialogApiMessage } from "@/components/AppDialogProvider";
import type { AppDictionary } from "@/i18n/types";
import type { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { isRecord } from "@/lib/narrowApiListRows";
import { decimalStringForStorage } from "@/lib/decimalInput";

export type WorkOrderSparePartRow = {
  id: number;
  partName: string;
  partSku: string;
  quantity: string;
  unitPrice: string | null;
  notes: string | null;
};

export function narrowWorkOrderSparePartRows(data: unknown[]): WorkOrderSparePartRow[] {
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
  return rows;
}

type UseWorkerSparePartsActionsArgs = {
  workOrderId: number | null;
  resourceGroupId: number | null;
  workerDict: AppDictionary["worker"]["client"];
  durDict: AppDictionary["dur"]["workOrderSpareParts"];
  apiErrors: Record<string, string>;
  durApiErrors: Record<string, string>;
  appAlert: (options: AppAlertOptions) => Promise<void>;
  appConfirm: (options: AppConfirmOptions) => Promise<boolean>;
  fetchParts: () => Promise<void>;
  fetchCatalog: ReturnType<typeof useDurSparePartCatalog>["fetchCatalog"];
  selectedPartId: string;
  addQuantity: string;
  addNotes: string;
  setIsAdding: (val: boolean) => void;
  setShowAddForm: (val: boolean) => void;
  setSelectedPartId: (val: string) => void;
  setAddQuantity: (val: string) => void;
  setAddNotes: (val: string) => void;
};

export function useWorkerSparePartsActions(args: UseWorkerSparePartsActionsArgs) {
  const { workOrderId, resourceGroupId, workerDict, durDict, apiErrors, durApiErrors } = args;
  const { appAlert, appConfirm, fetchParts, fetchCatalog } = args;

  const handleAddPart = async () => {
    const partIdNum = parseInt(args.selectedPartId, 10);
    if (!partIdNum || Number.isNaN(partIdNum)) return;
    if (!workOrderId) return;

    args.setIsAdding(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: spare-parts POST work-order ${workOrderId}`,
        `/api/worker/work-orders/${workOrderId}/spare-parts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partId: partIdNum,
            quantity: decimalStringForStorage(args.addQuantity || "1") ?? "1",
            notes: args.addNotes || null,
          }),
        },
        { category: "orders" }
      );

      if (res.ok) {
        await appAlert({ message: workerDict.pickPartSuccess });
        args.setShowAddForm(false);
        args.setSelectedPartId("");
        args.setAddQuantity("1");
        args.setAddNotes("");
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
      args.setIsAdding(false);
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

  return { handleAddPart, handleReturnPart };
}
