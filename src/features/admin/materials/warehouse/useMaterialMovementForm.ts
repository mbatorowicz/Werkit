"use client";

import { useRef, useState, type FormEvent } from "react";
import { sendStockMovement } from "@/lib/stockMovementRequest";
import { offlineOwner } from "@/lib/offlineOwner";
import { useDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { materialsApi } from "@/lib/appRoutes";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";

interface UseMaterialMovementFormArgs {
  tab: "receipts" | "issues";
  loadMovements: () => Promise<void>;
  onRefreshMaterials: () => void;
}

export function useMaterialMovementForm({
  tab,
  loadMovements,
  onRefreshMaterials,
}: UseMaterialMovementFormArgs) {
  const { alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const owner = offlineOwner();
  const inFlight = useRef(false);

  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  function openModal() {
    setMaterialId("");
    setQuantity("");
    setUnitPrice("");
    setInvoiceNumber("");
    setNotes("");
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const mid = parseInt(materialId, 10);
    const qty = parseDecimalInput(quantity);
    if (!mid || Number.isNaN(mid) || qty == null || qty <= 0) {
      await appAlert({ message: apiErrors.invalid_quantity });
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
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

      const res = await sendStockMovement(url, JSON.stringify(body), owner);
      const parsed = await parseJsonUnknown(res);
      const code = readApiErrorString(parsed);
      if (!res.ok) {
        await appAlert({ message: appDialogApiMessage(apiErrors, code, apiErrors.save_error) });
        return;
      }
      setShowModal(false);
      await loadMovements();
      onRefreshMaterials();
      await appAlert({ message: wh.movementSaveSuccess });
    } catch (error) {
      await appAlert({
        message: appDialogApiMessage(
          apiErrors,
          error instanceof Error ? error.message : undefined,
          apiErrors.fetch_error
        ),
      });
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    showModal,
    setShowModal,
    isSubmitting,
    materialId,
    setMaterialId,
    quantity,
    setQuantity,
    unitPrice,
    setUnitPrice,
    invoiceNumber,
    setInvoiceNumber,
    notes,
    setNotes,
    openModal,
    handleSubmit,
  };
}
