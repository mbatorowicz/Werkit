"use client";

import { useState, type FormEvent } from "react";
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

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
    } catch {
      await appAlert({ message: apiErrors.fetch_error });
    }
    setIsSubmitting(false);
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
