"use client";

import { type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { DecimalInput } from "@/components/DecimalInput";
import { UiButton } from "@/components/UiButton";
import { useDictionary } from "@/i18n";
import { SELECT_BASE } from "@/lib/uiTokens";
import { FIELD_LABEL_COMPACT } from "@/lib/uiTypography";

interface WorkOrderSparePartAddFormProps {
  catalogOptions: AdminSearchComboboxOption[];
  selectedPartId: string;
  onSelectedPartIdChange: (value: string) => void;
  addQuantity: string;
  onAddQuantityChange: (value: string) => void;
  addUnitPrice: string;
  onAddUnitPriceChange: (value: string) => void;
  addNotes: string;
  onAddNotesChange: (value: string) => void;
  isAdding: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WorkOrderSparePartAddForm({
  catalogOptions,
  selectedPartId,
  onSelectedPartIdChange,
  addQuantity,
  onAddQuantityChange,
  addUnitPrice,
  onAddUnitPriceChange,
  addNotes,
  onAddNotesChange,
  isAdding,
  onSubmit,
  onCancel,
}: WorkOrderSparePartAddFormProps) {
  const dict = useDictionary();
  const durDict = dict.dur.workOrderSpareParts;
  const adminOrdersDict = dict.admin.orders;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-3">
      <div>
        <label className={FIELD_LABEL_COMPACT}>
          {durDict.fields.part}
        </label>
        <SparePartSearchField
          options={catalogOptions}
          value={selectedPartId}
          onChange={onSelectedPartIdChange}
          placeholder={durDict.fields.partPlaceholder}
          required
          aria-label={durDict.fields.part}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={FIELD_LABEL_COMPACT}>
            {durDict.fields.quantity}
          </label>
          <DecimalInput
            value={addQuantity}
            onChange={onAddQuantityChange}
            placeholder={durDict.fields.quantityPlaceholder}
            className={SELECT_BASE}
          />
        </div>
        <div>
          <label className={FIELD_LABEL_COMPACT}>
            {durDict.fields.unitPrice}
          </label>
          <DecimalInput
            value={addUnitPrice}
            onChange={onAddUnitPriceChange}
            placeholder={durDict.fields.unitPricePlaceholder}
            className={SELECT_BASE}
          />
        </div>
      </div>

      <div>
        <label className={FIELD_LABEL_COMPACT}>
          {durDict.fields.notes}
        </label>
        <input
          type="text"
          value={addNotes}
          onChange={(e) => onAddNotesChange(e.target.value)}
          placeholder={durDict.fields.notesPlaceholder}
          className={SELECT_BASE}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <UiButton type="button" variant="secondarySm" onClick={onCancel}>
          {dict.common.actions.cancel}
        </UiButton>
        <UiButton
          type="button"
          variant="primaryCompactSm"
          disabled={!selectedPartId || isAdding}
          onClick={onSubmit}
        >
          {isAdding ? adminOrdersDict.saving : adminOrdersDict.addSparePart}
        </UiButton>
      </div>
    </div>
  );
}
