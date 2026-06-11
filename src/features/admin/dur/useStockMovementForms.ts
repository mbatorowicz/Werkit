"use client";

import { useCallback, useMemo, useState } from "react";
import type { DurSparePartCatalogItem } from "./useDurSparePartCatalog";
import { useStockMovementSubmit } from "./useStockMovementSubmit";

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
  const { isSubmitting, saveReceipt, saveIssue } = useStockMovementSubmit({
    fetchData,
    fetchCatalog,
    closeModal,
  });

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

  const handleSaveReceipt = useCallback(
    () =>
      saveReceipt({
        partId: rPartId,
        quantity: rQuantity,
        unitPrice: rUnitPrice,
        invoiceNumber: rInvoiceNumber,
        notes: rNotes,
      }),
    [saveReceipt, rPartId, rQuantity, rUnitPrice, rInvoiceNumber, rNotes]
  );

  const handleSaveIssue = useCallback(
    () =>
      saveIssue(
        {
          partId: iPartId,
          quantity: iQuantity,
          workOrderId: iWorkOrderId,
          issuedTo: iIssuedTo,
          notes: iNotes,
        },
        selectedCatalogItem
      ),
    [saveIssue, iPartId, iQuantity, iWorkOrderId, iIssuedTo, iNotes, selectedCatalogItem]
  );

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
