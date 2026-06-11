"use client";

import { useCallback, useMemo, useState } from "react";
import { useDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { DurSparePartCatalogItem } from "./useDurSparePartCatalog";

interface UseStockMovementFormsArgs {
  tab: "receipts" | "issues";
  catalogItems: DurSparePartCatalogItem[];
  fetchData: () => Promise<void>;
  fetchCatalog: () => Promise<void>;
  closeModal: () => void;
}

export function useStockMovementForms({
  tab,
  catalogItems,
  fetchData,
  fetchCatalog,
  closeModal,
}: UseStockMovementFormsArgs) {
  const { alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const dWh = dictionary.dur.warehouse;
  const issuesDict = dWh.issues;
  const receiptsDict = dWh.receipts;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;
  const globalApiErrors = dictionary.apiErrors as Record<string, string>;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rPartId, setRPartId] = useState("");
  const [rQuantity, setRQuantity] = useState("");
  const [rUnitPrice, setRUnitPrice] = useState("");
  const [rInvoiceNumber, setRInvoiceNumber] = useState("");
  const [rNotes, setRNotes] = useState("");

  const [iPartId, setIPartId] = useState("");
  const [iQuantity, setIQuantity] = useState("");
  const [iWorkOrderId, setIWorkOrderId] = useState("");
  const [iIssuedTo, setIIssuedTo] = useState("");
  const [iNotes, setINotes] = useState("");

  const resetForms = useCallback(() => {
    setRPartId("");
    setRQuantity("");
    setRUnitPrice("");
    setRInvoiceNumber("");
    setRNotes("");
    setIPartId("");
    setIQuantity("");
    setIWorkOrderId("");
    setIIssuedTo("");
    setINotes("");
  }, []);

  const selectedCatalogItem = useMemo(
    () => catalogItems.find((p) => String(p.id) === (tab === "receipts" ? rPartId : iPartId)),
    [catalogItems, tab, rPartId, iPartId]
  );

  const handleReceiptPartChange = useCallback(
    (partId: string) => {
      setRPartId(partId);
      if (!partId || rUnitPrice.trim()) return;
      const item = catalogItems.find((p) => String(p.id) === partId);
      if (item?.purchasePrice) {
        setRUnitPrice(item.purchasePrice);
      }
    },
    [catalogItems, rUnitPrice]
  );

  const handleSaveReceipt = useCallback(async () => {
    const partId = parseInt(rPartId, 10);
    if (!partId || Number.isNaN(partId)) {
      await appAlert({ message: durApiErrors.missing_part_id ?? receiptsDict.fields.part });
      return;
    }
    const qty = parseDecimalInput(rQuantity);
    if (!rQuantity.trim() || qty == null || qty <= 0) {
      await appAlert({ message: durApiErrors.invalid_quantity ?? receiptsDict.fields.quantity });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dur/stock/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          quantity: decimalStringForStorage(rQuantity) ?? rQuantity.trim(),
          unitPrice: rUnitPrice.trim() ? decimalStringForStorage(rUnitPrice) : null,
          invoiceNumber: rInvoiceNumber.trim() || null,
          notes: rNotes.trim() || null,
        }),
      });
      if (res.ok) {
        closeModal();
        await fetchData();
        await fetchCatalog();
        await appAlert({ message: wh.movementSaveSuccess });
        return;
      }
      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      await appAlert({
        message: appDialogApiMessage(
          { ...globalApiErrors, ...durApiErrors },
          code,
          dictionary.apiErrors.save_error
        ),
      });
    } catch {
      await appAlert({ message: dictionary.apiErrors.save_error });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    rPartId,
    rQuantity,
    rUnitPrice,
    rInvoiceNumber,
    rNotes,
    appAlert,
    durApiErrors,
    receiptsDict.fields,
    closeModal,
    fetchData,
    fetchCatalog,
    globalApiErrors,
    dictionary.apiErrors.save_error,
    wh.movementSaveSuccess,
  ]);

  const handleSaveIssue = useCallback(async () => {
    const partId = parseInt(iPartId, 10);
    if (!partId || Number.isNaN(partId)) {
      await appAlert({ message: durApiErrors.missing_part_id ?? issuesDict.fields.part });
      return;
    }
    const qty = parseDecimalInput(iQuantity);
    if (!iQuantity.trim() || qty == null || qty <= 0) {
      await appAlert({ message: durApiErrors.invalid_quantity ?? issuesDict.fields.quantity });
      return;
    }

    const available = parseDecimalInput(selectedCatalogItem?.stockQuantity ?? "0") ?? 0;
    if (available < qty) {
      await appAlert({
        message: issuesDict.insufficientStock
          .replace("{available}", String(available))
          .replace("{unit}", selectedCatalogItem?.unit ?? "szt"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dur/stock/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          quantity: decimalStringForStorage(iQuantity) ?? iQuantity.trim(),
          workOrderId: iWorkOrderId ? parseInt(iWorkOrderId, 10) : null,
          issuedTo: iIssuedTo ? parseInt(iIssuedTo, 10) : null,
          notes: iNotes.trim() || null,
        }),
      });
      if (res.ok) {
        closeModal();
        await fetchData();
        await fetchCatalog();
        await appAlert({ message: wh.movementSaveSuccess });
        return;
      }
      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      if (code === "insufficient_stock" && selectedCatalogItem) {
        await appAlert({
          message: issuesDict.insufficientStock
            .replace("{available}", selectedCatalogItem.stockQuantity)
            .replace("{unit}", selectedCatalogItem.unit),
        });
        return;
      }
      await appAlert({
        message: appDialogApiMessage(
          { ...globalApiErrors, ...durApiErrors },
          code,
          dictionary.apiErrors.save_error
        ),
      });
    } catch {
      await appAlert({ message: dictionary.apiErrors.save_error });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    iPartId,
    iQuantity,
    iWorkOrderId,
    iIssuedTo,
    iNotes,
    selectedCatalogItem,
    appAlert,
    durApiErrors,
    issuesDict,
    closeModal,
    fetchData,
    fetchCatalog,
    globalApiErrors,
    dictionary.apiErrors.save_error,
    wh.movementSaveSuccess,
  ]);

  return {
    isSubmitting,
    rPartId,
    rQuantity,
    rUnitPrice,
    rInvoiceNumber,
    rNotes,
    setRQuantity,
    setRUnitPrice,
    setRInvoiceNumber,
    setRNotes,
    iPartId,
    iQuantity,
    iWorkOrderId,
    iIssuedTo,
    iNotes,
    setIPartId,
    setIQuantity,
    setIWorkOrderId,
    setIIssuedTo,
    setINotes,
    resetForms,
    handleReceiptPartChange,
    handleSaveReceipt,
    handleSaveIssue,
  };
}
