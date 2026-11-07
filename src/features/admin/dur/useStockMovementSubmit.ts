"use client";

import { useCallback, useRef, useState } from "react";
import { sendStockMovement } from "@/lib/stockMovementRequest";
import { offlineOwner } from "@/lib/offlineOwner";
import { useDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { DurSparePartCatalogItem } from "./useDurSparePartCatalog";

export interface StockReceiptFormValues {
  partId: string;
  quantity: string;
  unitPrice: string;
  invoiceNumber: string;
  notes: string;
}

export interface StockIssueFormValues {
  partId: string;
  quantity: string;
  workOrderId: string;
  issuedTo: string;
  notes: string;
}

interface UseStockMovementSubmitArgs {
  fetchData: () => Promise<void>;
  fetchCatalog: () => Promise<void>;
  closeModal: () => void;
}

function parsePositivePartId(raw: string): number | null {
  const partId = parseInt(raw, 10);
  if (!partId || Number.isNaN(partId)) return null;
  return partId;
}

function parsePositiveQuantity(raw: string): number | null {
  const qty = parseDecimalInput(raw);
  if (!raw.trim() || qty == null || qty <= 0) return null;
  return qty;
}

function insufficientStockMessage(template: string, available: string, unit: string): string {
  return template.replace("{available}", available).replace("{unit}", unit);
}

function postStockReceipt(
  partId: number,
  form: StockReceiptFormValues,
  owner: string | null
): Promise<Response> {
  return sendStockMovement(
    "/api/dur/stock/receipts",
    JSON.stringify({
      partId,
      quantity: decimalStringForStorage(form.quantity) ?? form.quantity.trim(),
      unitPrice: form.unitPrice.trim() ? decimalStringForStorage(form.unitPrice) : null,
      invoiceNumber: form.invoiceNumber.trim() || null,
      notes: form.notes.trim() || null,
    }),
    owner
  );
}

function postStockIssue(
  partId: number,
  form: StockIssueFormValues,
  owner: string | null
): Promise<Response> {
  return sendStockMovement(
    "/api/dur/stock/issues",
    JSON.stringify({
      partId,
      quantity: decimalStringForStorage(form.quantity) ?? form.quantity.trim(),
      workOrderId: form.workOrderId ? parseInt(form.workOrderId, 10) : null,
      issuedTo: form.issuedTo ? parseInt(form.issuedTo, 10) : null,
      notes: form.notes.trim() || null,
    }),
    owner
  );
}

export function useStockMovementSubmit({
  fetchData,
  fetchCatalog,
  closeModal,
}: UseStockMovementSubmitArgs) {
  const { alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const issuesDict = dictionary.dur.warehouse.issues;
  const receiptsDict = dictionary.dur.warehouse.receipts;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;
  const globalApiErrors = dictionary.apiErrors as Record<string, string>;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const owner = offlineOwner();
  const inFlight = useRef(false);

  const alertSaveError = useCallback(
    async (code: string | undefined) => {
      await appAlert({
        message: appDialogApiMessage(
          { ...globalApiErrors, ...durApiErrors },
          code,
          dictionary.apiErrors.save_error
        ),
      });
    },
    [appAlert, globalApiErrors, durApiErrors, dictionary.apiErrors.save_error]
  );

  const finishSuccess = useCallback(async () => {
    closeModal();
    await fetchData();
    await fetchCatalog();
    await appAlert({ message: wh.movementSaveSuccess });
  }, [closeModal, fetchData, fetchCatalog, appAlert, wh.movementSaveSuccess]);

  const saveReceipt = useCallback(
    async (form: StockReceiptFormValues) => {
      const partId = parsePositivePartId(form.partId);
      if (partId == null) {
        await appAlert({ message: durApiErrors.missing_part_id ?? receiptsDict.fields.part });
        return;
      }
      if (parsePositiveQuantity(form.quantity) == null) {
        await appAlert({ message: durApiErrors.invalid_quantity ?? receiptsDict.fields.quantity });
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await postStockReceipt(partId, form, owner);
        if (res.ok) {
          await finishSuccess();
          return;
        }
        const body = await parseJsonUnknown(res);
        await alertSaveError(readApiErrorString(body));
      } catch (error) {
        await alertSaveError(error instanceof Error ? error.message : undefined);
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [owner, appAlert, durApiErrors, receiptsDict.fields, finishSuccess, alertSaveError]
  );

  const saveIssue = useCallback(
    async (
      form: StockIssueFormValues,
      selectedCatalogItem: DurSparePartCatalogItem | undefined
    ) => {
      const partId = parsePositivePartId(form.partId);
      if (partId == null) {
        await appAlert({ message: durApiErrors.missing_part_id ?? issuesDict.fields.part });
        return;
      }
      const qty = parsePositiveQuantity(form.quantity);
      if (qty == null) {
        await appAlert({ message: durApiErrors.invalid_quantity ?? issuesDict.fields.quantity });
        return;
      }
      const available = parseDecimalInput(selectedCatalogItem?.stockQuantity ?? "0") ?? 0;
      if (available < qty) {
        await appAlert({
          message: insufficientStockMessage(
            issuesDict.insufficientStock,
            String(available),
            selectedCatalogItem?.unit ?? "szt"
          ),
        });
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await postStockIssue(partId, form, owner);
        if (res.ok) {
          await finishSuccess();
          return;
        }
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        if (code === "insufficient_stock" && selectedCatalogItem) {
          await appAlert({
            message: insufficientStockMessage(
              issuesDict.insufficientStock,
              selectedCatalogItem.stockQuantity,
              selectedCatalogItem.unit
            ),
          });
          return;
        }
        await alertSaveError(code);
      } catch (error) {
        await alertSaveError(error instanceof Error ? error.message : undefined);
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [owner, appAlert, durApiErrors, issuesDict, finishSuccess, alertSaveError]
  );

  return { isSubmitting, saveReceipt, saveIssue };
}
