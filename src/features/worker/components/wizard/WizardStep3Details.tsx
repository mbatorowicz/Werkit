"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type {
  WizardCategory,
  WizardCustomer,
  WizardMachine,
  WizardMaterial,
  WizardMaterialCategory,
} from "@/types/wizard";
import {
  MaterialCategoryMaterialCombobox,
  type MaterialCategoryMaterialComboboxDict,
} from "@/components/materials/MaterialCategoryMaterialCombobox";
import { CustomerSearchField } from "@/components/customers/CustomerSearchField";
import { workerCustomerSearchFieldDict } from "@/components/customers/customerSearchFieldDict";
import { DecimalInput } from "@/components/DecimalInput";
import { isRepairOrderType } from "@/lib/orderType";

type Dict = AppDictionary["worker"]["client"];

type Props = {
  dict: Dict;
  selectedCategory: WizardCategory | undefined;
  machines: WizardMachine[];
  materials: WizardMaterial[];
  materialCategories: WizardMaterialCategory[];
  customers: WizardCustomer[];
  resourceId: string;
  materialCategoryId: string;
  setMaterialCategoryId: (id: string) => void;
  materialId: string;
  setMaterialId: (id: string) => void;
  customerId: string;
  setCustomerId: (id: string) => void;
  quantityTons: string;
  setQuantityTons: (v: string) => void;
  taskDescription: string;
  setTaskDescription: (v: string) => void;
  repairDescription: string;
  setRepairDescription: (v: string) => void;
  setStep: (s: number) => void;
  canCreateCustomers: boolean;
  onCustomerCreated: (customer: WizardCustomer) => void;
};

export function WizardStep3Details({
  dict,
  selectedCategory,
  machines,
  materials,
  materialCategories,
  customers,
  resourceId,
  materialCategoryId,
  setMaterialCategoryId,
  materialId,
  setMaterialId,
  customerId,
  setCustomerId,
  quantityTons,
  setQuantityTons,
  taskDescription,
  setTaskDescription,
  repairDescription,
  setRepairDescription,
  setStep,
  canCreateCustomers,
  onCustomerCreated,
}: Props) {
  const materialPickerDict: MaterialCategoryMaterialComboboxDict = useMemo(
    () => ({
      chooseCategory: dict.materialPickerChooseCategory,
      searchMaterial: dict.materialPickerSearchMaterial,
      noCategories: dict.materialPickerNoCategories,
      noMaterialsInCategory: dict.materialPickerNoMaterialsInCategory,
      clearCategory: dict.materialPickerClearCategory,
      clear: dict.searchClear,
      noResults: dict.searchNoResults,
    }),
    [dict]
  );

  const customerSearchDict = workerCustomerSearchFieldDict(dict);
  const isRepair = isRepairOrderType(selectedCategory?.orderType);

  const nextDisabled =
    (selectedCategory?.reqMaterial && !materialId) ||
    (selectedCategory?.reqCustomer && !customerId) ||
    (selectedCategory?.reqQuantity && !quantityTons) ||
    (selectedCategory?.reqTaskDescription &&
      (isRepair ? !repairDescription.trim() : !taskDescription.trim()));

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        {dict.wizardStep3Title}
      </h2>
      <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep3Subtitle}</p>

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

      <div className="space-y-5">
        {selectedCategory?.showMaterial ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.wizardMaterialLabel}</label>
            <MaterialCategoryMaterialCombobox
              categories={materialCategories}
              materials={materials}
              materialCategoryId={materialCategoryId}
              materialId={materialId}
              onMaterialCategoryChange={(id) => {
                setMaterialCategoryId(id);
                setMaterialId("");
              }}
              onMaterialChange={setMaterialId}
              dict={materialPickerDict}
              placeholder={
                materialCategoryId ? dict.wizardMaterialPlaceholder : undefined
              }
              required={selectedCategory.reqMaterial}
              aria-label={dict.wizardMaterialLabel}
            />
          </div>
        ) : null}

        {selectedCategory?.showCustomer ? (
          <CustomerSearchField
            label={dict.wizardCustomerLabel}
            customers={customers}
            value={customerId}
            onChange={setCustomerId}
            onCustomerCreated={onCustomerCreated}
            required={selectedCategory.reqCustomer}
            canCreate={canCreateCustomers}
            dict={customerSearchDict}
            telemetryCategory="lifecycle"
          />
        ) : null}

        {selectedCategory?.showQuantity ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.wizardQuantityLabel}</label>
            <DecimalInput
              value={quantityTons}
              onChange={setQuantityTons}
              placeholder={dict.wizardQuantityPlaceholder}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        ) : null}

        {selectedCategory?.showTaskDescription ? (
          isRepair ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.repairDescription}</label>
              <textarea
                required={selectedCategory.reqTaskDescription}
                value={repairDescription}
                onChange={(e) => setRepairDescription(e.target.value)}
                placeholder={dict.repairDescriptionPlaceholder}
                className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.wizardDescLabel}</label>
              <textarea
                required={selectedCategory.reqTaskDescription}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder={dict.wizardDescPlaceholder}
                className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>
          )
        ) : null}
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
          {dict.wizardNext} <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
