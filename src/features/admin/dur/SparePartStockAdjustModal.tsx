"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { DecimalInput } from "@/components/DecimalInput";
import { FormModalFooter } from "@/components/FormModalFooter";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import { useAppDialog } from "@/components/AppDialogProvider";
import { getDictionary } from "@/i18n";
import type { InventoryAdjustmentInput, SparePart } from "@/types/dur";

type Props = {
  open: boolean;
  part: SparePart | null;
  onClose: () => void;
  onSaved: () => void;
};

export function SparePartStockAdjustModal({ open, part, onClose, onSaved }: Props) {
  const { alert: appAlert } = useAppDialog();
  const dictionary = getDictionary();
  const adjDict = dictionary.dur.warehouse.adjustment;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;

  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!part) return;
    setQuantity(part.stockQuantity ?? "0");
    setNotes("");
  }, [part]);

  const handleSubmit = useCallback(async () => {
    if (!part) return;
    const qty = parseDecimalInput(quantity);
    if (qty == null || qty < 0) {
      await appAlert({
        message: durApiErrors.invalid_quantity ?? apiErrors.invalid_payload ?? "Nieprawidłowa ilość.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: InventoryAdjustmentInput = {
        partId: part.id,
        quantity: decimalStringForStorage(quantity) ?? String(qty),
        notes: notes.trim() || null,
      };
      const res = await fetch("/api/dur/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = (err as { error?: string }).error;
        await appAlert({
          message:
            (code && durApiErrors[code]) ||
            (code && apiErrors[code]) ||
            code ||
            apiErrors.save_error ||
            "Błąd zapisu.",
        });
        return;
      }
      onSaved();
      onClose();
    } catch {
      await appAlert({ message: apiErrors.fetch_error ?? "Błąd sieci." });
    } finally {
      setIsSubmitting(false);
    }
  }, [part, quantity, notes, appAlert, apiErrors, durApiErrors, onSaved, onClose]);

  if (!part) return null;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={adjDict.title}
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="spare-part-stock-adjust-form"
          onCancel={onClose}
          submitLabel={dictionary.dur.spareParts.save}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form
        id="spare-part-stock-adjust-form"
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {part.name}
          {part.catalogNumber ? ` (${part.catalogNumber})` : ""} — {dictionary.dur.warehouse.inventory.quantity}:{" "}
          <strong>
            {part.stockQuantity ?? "0"} {part.unit}
          </strong>
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {adjDict.quantityLabel}
          </label>
          <DecimalInput
            value={quantity}
            onChange={setQuantity}
            placeholder={adjDict.quantityPlaceholder}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {adjDict.notesLabel}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={adjDict.notesPlaceholder}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </form>
    </AdminModalShell>
  );
}
