"use client";

import type { ComponentProps } from "react";
import { SparePartSearchField } from "@/features/admin/dur/SparePartSearchField";
import { DecimalInput } from "@/components/DecimalInput";
import { UiButton } from "@/components/UiButton";
import { useDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import { SELECT_BASE } from "@/lib/uiTokens";
import { FIELD_LABEL_COMPACT } from "@/lib/uiTypography";

export function WorkerSparePartsAddForm({
  workerDict,
  catalogOptions,
  selectedPartId,
  setSelectedPartId,
  addQuantity,
  setAddQuantity,
  addNotes,
  setAddNotes,
  isAdding,
  onCancel,
  onSubmit,
}: {
  workerDict: AppDictionary["worker"]["client"];
  catalogOptions: ComponentProps<typeof SparePartSearchField>["options"];
  selectedPartId: string;
  setSelectedPartId: (val: string) => void;
  addQuantity: string;
  setAddQuantity: (val: string) => void;
  addNotes: string;
  setAddNotes: (val: string) => void;
  isAdding: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const cancelLabel = useDictionary().common.actions.cancel;

  return (
    <div className="mb-3 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div>
        <label className={FIELD_LABEL_COMPACT}>{workerDict.choosePart}</label>
        <SparePartSearchField
          options={catalogOptions}
          value={selectedPartId}
          onChange={setSelectedPartId}
          placeholder={workerDict.choosePart}
          required
          aria-label={workerDict.choosePart}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={FIELD_LABEL_COMPACT}>{workerDict.partQuantity}</label>
          <DecimalInput
            value={addQuantity}
            onChange={setAddQuantity}
            placeholder={workerDict.quantityPlaceholder}
            className={SELECT_BASE}
          />
        </div>
        <div>
          <label className={FIELD_LABEL_COMPACT}>{workerDict.partNotes}</label>
          <input
            type="text"
            value={addNotes}
            onChange={(e) => setAddNotes(e.target.value)}
            placeholder={workerDict.sparePartNotesPlaceholder}
            className={SELECT_BASE}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <UiButton type="button" variant="secondarySm" onClick={onCancel}>
          {cancelLabel}
        </UiButton>
        <UiButton
          type="button"
          variant="primaryCompactSm"
          disabled={!selectedPartId || isAdding}
          onClick={onSubmit}
        >
          {isAdding ? "…" : workerDict.addSparePart}
        </UiButton>
      </div>
    </div>
  );
}
