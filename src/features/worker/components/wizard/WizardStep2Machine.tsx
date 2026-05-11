"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardMachine } from "@/types/wizard";

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
  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{dict.wizardStep2Title}</h2>
      <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep2Subtitle}</p>

      <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 mb-6 flex justify-between items-center">
        <div className="text-sm">
          <span className="text-zinc-500">{dict.wizardSelectedType} </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedCategory?.name}</span>
        </div>
        <button type="button" onClick={() => setStep(1)} className="text-xs text-zinc-500 underline">
          {dict.wizardChangeLink}
        </button>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
        {availableMachines.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setResourceId(m.id.toString());
              setStep(3);
            }}
            className={`w-full p-4 rounded-lg border transition-all flex items-center gap-4 ${
              resourceId === m.id.toString()
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <div className="text-left w-full">
              <div className="font-bold">{m.name}</div>
              <div className="text-xs opacity-70 mt-1">ID: #{m.id}</div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50" />
          </button>
        ))}
        {availableMachines.length === 0 && (
          <div className="text-center p-6 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-800">
            {dict.wizardNoMachines}
          </div>
        )}
      </div>
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
