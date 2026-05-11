"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";

type Dict = AppDictionary["worker"]["client"];

type Props = {
  dict: Dict;
  selectedCategory: WizardCategory | undefined;
  machines: WizardMachine[];
  materials: WizardMaterial[];
  customers: WizardCustomer[];
  resourceId: string;
  materialId: string;
  setMaterialId: (id: string) => void;
  customerId: string;
  setCustomerId: (id: string) => void;
  quantityTons: string;
  setQuantityTons: (v: string) => void;
  taskDescription: string;
  setTaskDescription: (v: string) => void;
  setStep: (s: number) => void;
};

export function WizardStep3Details({
  dict,
  selectedCategory,
  machines,
  materials,
  customers,
  resourceId,
  materialId,
  setMaterialId,
  customerId,
  setCustomerId,
  quantityTons,
  setQuantityTons,
  taskDescription,
  setTaskDescription,
  setStep,
}: Props) {
  const nextDisabled =
    (selectedCategory?.reqMaterial && !materialId) ||
    (selectedCategory?.reqCustomer && !customerId) ||
    (selectedCategory?.reqQuantity && !quantityTons) ||
    (selectedCategory?.reqTaskDescription && !taskDescription);

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{dict.wizardStep3Title}</h2>
      <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep3Subtitle}</p>

      <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="text-zinc-500">{dict.wizardSelectedType} </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedCategory?.name}</span>
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-700 pt-2">
          <div className="text-sm">
            <span className="text-zinc-500">{dict.wizardSelectedMachine} </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {machines.find((m) => m.id.toString() === resourceId)?.name}
            </span>
          </div>
          <button type="button" onClick={() => setStep(2)} className="text-xs text-zinc-500 underline">
            {dict.wizardChangeLink}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {selectedCategory?.showMaterial && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.wizardMaterialLabel}</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
            >
              <option value="" disabled>
                {dict.wizardMaterialPlaceholder}
              </option>
              {materials.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedCategory?.showCustomer && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.wizardCustomerLabel}</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
            >
              <option value="" disabled>
                {dict.wizardCustomerPlaceholder}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName ? `${c.firstName} ` : ""}
                  {c.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedCategory?.showQuantity && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.wizardQuantityLabel}</label>
            <input
              type="number"
              step="0.01"
              value={quantityTons}
              onChange={(e) => setQuantityTons(e.target.value)}
              placeholder={dict.wizardQuantityPlaceholder}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        )}

        {(!selectedCategory || selectedCategory?.showTaskDescription) && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.wizardDescLabel}</label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder={dict.wizardDescPlaceholder}
              className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {dict.wizardBack}
        </button>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => setStep(4)}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
        >
          {dict.wizardNext} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
