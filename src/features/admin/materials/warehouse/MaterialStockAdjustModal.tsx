"use client";

import { useEffect, useState } from "react";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { DecimalInput } from "@/components/DecimalInput";
import { FormModalFooter } from "@/components/FormModalFooter";
import { decimalStringForStorage, parseDecimalInput } from "@/lib/decimalInput";
import { useAppDialog } from "@/components/AppDialogProvider";
import { formatDict } from "@/i18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { materialsApi } from "@/lib/appRoutes";
import { AdminFormField } from "@/components/Admin/AdminFormField";
import { INVENTORY_FORM_CONTROL, INVENTORY_FORM_STACK } from "@/components/Admin/adminInventoryFormStyles";
import type { MaterialRow } from "@/features/admin/materials/types";

type Props = {
  open: boolean;
  material: MaterialRow | null;
  dict: Record<string, string>;
  apiErrors: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
};

export function MaterialStockAdjustModal({
  open,
  material,
  dict,
  apiErrors,
  onClose,
  onSaved,
}: Props) {
  const { alert: appAlert } = useAppDialog();
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!material) return;
    setQuantity(material.stockQuantity ?? "0");
  }, [material]);

  async function handleSubmit() {
    if (!material) return;
    const qty = parseDecimalInput(quantity);
    if (qty == null || qty < 0) {
      await appAlert({ message: apiErrors.invalid_quantity ?? dict.invalidQuantity });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(materialsApi.inventory, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: material.id,
          quantity: decimalStringForStorage(quantity) ?? String(qty),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        await appAlert({ message: apiErrors[err.error ?? ""] ?? apiErrors.save_error });
        return;
      }
      onSaved();
      onClose();
    } catch {
      await appAlert({ message: apiErrors.fetch_error });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!material) return null;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={dict.adjustTitle}
      maxWidthClass="max-w-md"
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="material-stock-adjust-form"
          onCancel={onClose}
          isSubmitting={isSubmitting}
          submitLabel={dict.adjustSave}
          cancelLabel={dict.adjustCancel}
        />
      }
    >
      <form
        id="material-stock-adjust-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className={`${INVENTORY_FORM_STACK} p-6`}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDict(dict.adjustHint, {
            name: material.name,
            unit: material.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
          })}
        </p>
        <AdminFormField
          label={formatDict(dict.fieldQuantityWithUnit, {
            unit: material.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
          })}
          required
        >
          <DecimalInput
            value={quantity}
            onChange={setQuantity}
            placeholder="0"
            className={INVENTORY_FORM_CONTROL}
            required
          />
        </AdminFormField>
      </form>
    </AdminModalShell>
  );
}
