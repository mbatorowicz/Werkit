"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardMachine } from "@/types/wizard";
import { AdminSearchCombobox } from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";

type Dict = AppDictionary["worker"]["client"];

type Props = {
  dict: Dict;
  selectedCategory: WizardCategory | undefined;
  availableMachines: WizardMachine[];
  resourceId: string;
  setResourceId: (id: string) => void;
  setStep: (s: number) => void;
};

export function WizardStep2Machine({
  dict,
  selectedCategory,
  availableMachines,
  resourceId,
  setResourceId,
  setStep,
}: Props) {
  const machineOptions = useMemo(
    () =>
      availableMachines.map((m) => ({
        id: String(m.id),
        label: m.name,
        sublabel: m.description?.trim() || undefined,
      })),
    [availableMachines]
  );

  const noMachines = availableMachines.length === 0;

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        {dict.wizardStep2Title}
      </h2>
      <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep2Subtitle}</p>

      <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 mb-6 flex justify-between items-center">
        <div className="text-sm">
          <span className="text-zinc-500">{dict.wizardSelectedType} </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {selectedCategory?.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-xs text-zinc-500 underline"
        >
          {dict.wizardChangeLink}
        </button>
      </div>

      {noMachines ? (
        <div className="text-center p-6 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-800">
          {dict.wizardNoMachines}
        </div>
      ) : (
        <div className="space-y-4">
          <AdminSearchCombobox
            options={machineOptions}
            value={resourceId}
            onChange={setResourceId}
            placeholder={dict.searchPlaceholder}
            required
            {...comboboxFeedbackProps(dict)}
            aria-label={dict.wizardStep2Title}
          />
          <button
            type="button"
            disabled={!resourceId}
            onClick={() => setStep(3)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {dict.wizardNext} <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {dict.wizardBackToType}
        </button>
      </div>
    </div>
  );
}
