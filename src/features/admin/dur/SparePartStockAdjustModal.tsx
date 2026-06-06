"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminFormField } from "@/components/Admin/AdminFormField";
import {
  INVENTORY_FORM_CONTROL,
  INVENTORY_FORM_STACK,
  INVENTORY_FORM_TEXTAREA,
} from "@/components/Admin/adminInventoryFormStyles";
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
        className={`${INVENTORY_FORM_STACK} p-6`}
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
        <AdminFormField label={adjDict.quantityLabel} required>
          <DecimalInput
            value={quantity}
            onChange={setQuantity}
            placeholder={adjDict.quantityPlaceholder}
            className={INVENTORY_FORM_CONTROL}
            required
          />
        </AdminFormField>
        <AdminFormField label={adjDict.notesLabel}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={adjDict.notesPlaceholder}
            rows={3}
            className={INVENTORY_FORM_TEXTAREA}
          />
        </AdminFormField>
      </form>
    </AdminModalShell>
  );
}
