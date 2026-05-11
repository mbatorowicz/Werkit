"use client";

import { ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";

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
  isLoading: boolean;
  onStart: () => void;
  setStep: (s: number) => void;
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
  isLoading,
  onStart,
  setStep,
}: Props) {
  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col items-center">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 text-center">{dict.wizardStep4Title}</h2>
      <p className="text-zinc-500 text-sm mb-8 text-center">{dict.wizardStep4Subtitle}</p>

      <div className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 space-y-3 mb-10">
        <div className="flex justify-between">
          <span className="text-zinc-500 text-sm">{dict.wizardSummaryType}</span>
          <span className="text-zinc-900 dark:text-white font-medium">{selectedCategory?.name}</span>
        </div>
        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <span className="text-zinc-500 text-sm">{dict.wizardSummaryMachine}</span>
          <span className="text-zinc-900 dark:text-white font-medium">
            {machines.find((m) => m.id.toString() === resourceId)?.name}
          </span>
        </div>
        {selectedCategory?.showMaterial && (
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span className="text-zinc-500 text-sm">{dict.wizardSummaryAggregate}</span>
            <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[150px] text-right">
              {materials.find((m) => m.id.toString() === materialId)?.name}
              {quantityTons ? ` (${quantityTons}t)` : ""}
            </span>
          </div>
        )}
        {selectedCategory?.showCustomer && (
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span className="text-zinc-500 text-sm">{dict.wizardSummaryCustomer}</span>
            <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[150px] text-right">
              {customers.find((c) => c.id.toString() === customerId)?.lastName}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={isLoading}
        onClick={onStart}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-lg font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
      >
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : dict.wizardStartWork}
      </button>

      <button
        type="button"
        onClick={() => setStep(3)}
        className="mt-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> {dict.wizardFixData}
      </button>
    </div>
  );
}
