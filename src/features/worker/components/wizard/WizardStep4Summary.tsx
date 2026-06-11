"use client";

import { ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import { isRepairOrderType } from "@/lib/orderType";
import { orderLabelDescriptionText } from "@/lib/orderLabelFieldVisibility";
import { WizardStep4SummaryCard } from "@/features/worker/components/wizard/WizardStep4SummaryCard";

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

      <WizardStep4SummaryCard
        dict={dict}
        selectedCategory={selectedCategory}
        machines={machines}
        materials={materials}
        customers={customers}
        materialId={materialId}
        customerId={customerId}
        quantityTons={quantityTons}
        resourceId={resourceId}
        isRepair={isRepair}
        summaryDescription={summaryDescription}
        dueDate={dueDate}
        expectedDurationHours={expectedDurationHours}
      />

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
