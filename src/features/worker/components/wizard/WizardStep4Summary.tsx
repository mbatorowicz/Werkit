"use client";

import { ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import { isRepairOrderType } from "@/lib/orderType";
import { orderLabelDescriptionText } from "@/lib/orderLabelFieldVisibility";

type Dict = AppDictionary["worker"]["client"];

type Props = {
  dict: Dict;
  selectedCategory: WizardCategory | undefined;
  machines: WizardMachine[];
  materials: WizardMaterial[];
  customers: WizardCustomer[];
  materialId: string;
  customerId: string;
  quantityTons: string;
  resourceId: string;
  taskDescription: string;
  repairDescription: string;
  dueDate: string;
  expectedDurationHours: string;
  hasScheduleConflicts: boolean;
  isLoading: boolean;
  onSave: () => void;
  setStep: (s: number) => void;
  saveLabel?: string;
};

export function WizardStep4Summary({
  dict,
  selectedCategory,
  machines,
  materials,
  customers,
  materialId,
  customerId,
  quantityTons,
  resourceId,
  taskDescription,
  repairDescription,
  dueDate,
  expectedDurationHours,
  hasScheduleConflicts,
  isLoading,
  onSave,
  setStep,
  saveLabel,
}: Props) {
  const isRepair = isRepairOrderType(selectedCategory?.orderType);
  const summaryDescription = orderLabelDescriptionText({
    orderType: selectedCategory?.orderType,
    taskDescription,
    repairDescription,
  });

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col items-center">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 text-center">
        {dict.wizardStep5Title}
      </h2>
      <p className="text-zinc-500 text-sm mb-8 text-center">{dict.wizardStep5Subtitle}</p>

      <div className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 space-y-3 mb-10">
        <div className="flex justify-between">
          <span className="text-zinc-500 text-sm">{dict.wizardSummaryType}</span>
          <span className="text-zinc-900 dark:text-white font-medium">
            {selectedCategory?.name}
          </span>
        </div>
        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <span className="text-zinc-500 text-sm">{dict.wizardSummaryMachine}</span>
          <span className="text-zinc-900 dark:text-white font-medium">
            {machines.find((m) => m.id.toString() === resourceId)?.name}
          </span>
        </div>
        {selectedCategory?.showMaterial && materialId ? (
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span className="text-zinc-500 text-sm">{dict.wizardSummaryAggregate}</span>
            <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[150px] text-right">
              {materials.find((m) => m.id.toString() === materialId)?.name}
            </span>
          </div>
        ) : null}
        {selectedCategory?.showQuantity && quantityTons ? (
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span className="text-zinc-500 text-sm">{dict.wizardQuantityLabel}</span>
            <span className="text-zinc-900 dark:text-white font-medium">{quantityTons}t</span>
          </div>
        ) : null}
        {selectedCategory?.showTaskDescription && summaryDescription ? (
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3 gap-4">
            <span className="text-zinc-500 text-sm shrink-0">
              {isRepair ? dict.repairDescription : dict.wizardDescLabel}
            </span>
            <span className="text-zinc-900 dark:text-white font-medium text-right text-sm whitespace-pre-wrap">
              {summaryDescription}
            </span>
          </div>
        ) : null}
        {selectedCategory?.showCustomer && customerId ? (
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span className="text-zinc-500 text-sm">{dict.wizardSummaryCustomer}</span>
            <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[150px] text-right">
              {customers.find((c) => c.id.toString() === customerId)?.lastName}
            </span>
          </div>
        ) : null}
        {(dueDate || expectedDurationHours) && (
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span className="text-zinc-500 text-sm">{dict.wizardSummarySchedule}</span>
            <span className="text-zinc-900 dark:text-white font-medium text-right text-sm">
              {expectedDurationHours ? `${expectedDurationHours}h` : "—"}
              {dueDate ? ` · ${dueDate.replace("T", " ")}` : ""}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={isLoading || hasScheduleConflicts}
        onClick={onSave}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          (saveLabel ?? dict.wizardSaveOrder)
        )}
      </button>

      <button
        type="button"
        onClick={() => setStep(4)}
        className="mt-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> {dict.wizardFixData}
      </button>
    </div>
  );
}
