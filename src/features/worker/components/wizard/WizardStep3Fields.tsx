"use client";

import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardMachine } from "@/types/wizard";

type Dict = AppDictionary["worker"]["client"];

export function isWizardStep3NextDisabled(args: {
  selectedCategory: WizardCategory | undefined;
  isRepair: boolean;
  materialId: string;
  customerId: string;
  quantityTons: string;
  taskDescription: string;
  repairDescription: string;
}): boolean {
  const { selectedCategory, isRepair } = args;
  return Boolean(
    (selectedCategory?.reqMaterial && !args.materialId) ||
    (selectedCategory?.reqCustomer && !args.customerId) ||
    (selectedCategory?.reqQuantity && !args.quantityTons) ||
    (selectedCategory?.reqTaskDescription &&
      (isRepair ? !args.repairDescription.trim() : !args.taskDescription.trim()))
  );
}

export function WizardStep3SelectionSummary({
  dict,
  selectedCategory,
  machines,
  resourceId,
  setStep,
}: {
  dict: Dict;
  selectedCategory: WizardCategory | undefined;
  machines: WizardMachine[];
  resourceId: string;
  setStep: (s: number) => void;
}) {
  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 mb-6 space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-sm">
          <span className="text-zinc-500">{dict.wizardSelectedType} </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {selectedCategory?.name}
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-700 pt-2">
        <div className="text-sm">
          <span className="text-zinc-500">{dict.wizardSelectedMachine} </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {machines.find((m) => m.id.toString() === resourceId)?.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setStep(2)}
          className="text-xs text-zinc-500 underline"
        >
          {dict.wizardChangeLink}
        </button>
      </div>
    </div>
  );
}

export function WizardStep3DescriptionField({
  dict,
  isRepair,
  required,
  taskDescription,
  setTaskDescription,
  repairDescription,
  setRepairDescription,
}: {
  dict: Dict;
  isRepair: boolean;
  required: boolean;
  taskDescription: string;
  setTaskDescription: (v: string) => void;
  repairDescription: string;
  setRepairDescription: (v: string) => void;
}) {
  if (isRepair) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">{dict.repairDescription}</label>
        <textarea
          required={required}
          value={repairDescription}
          onChange={(e) => setRepairDescription(e.target.value)}
          placeholder={dict.repairDescriptionPlaceholder}
          className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
        />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">{dict.wizardDescLabel}</label>
      <textarea
        required={required}
        value={taskDescription}
        onChange={(e) => setTaskDescription(e.target.value)}
        placeholder={dict.wizardDescPlaceholder}
        className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
      />
    </div>
  );
}
