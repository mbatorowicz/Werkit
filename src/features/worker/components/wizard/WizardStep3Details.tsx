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
import {
  isWizardStep3NextDisabled,
  WizardStep3DescriptionField,
  WizardStep3SelectionSummary,
} from "@/features/worker/components/wizard/WizardStep3Fields";
import { UiButton } from "@/components/UiButton";
import { INPUT_BASE } from "@/lib/uiTokens";
import { FIELD_LABEL } from "@/lib/uiTypography";

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

  const nextDisabled = isWizardStep3NextDisabled({
    selectedCategory,
    isRepair,
    materialId,
    customerId,
    quantityTons,
    taskDescription,
    repairDescription,
  });

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        {dict.wizardStep3Title}
      </h2>
      <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep3Subtitle}</p>

      <WizardStep3SelectionSummary
        dict={dict}
        selectedCategory={selectedCategory}
        machines={machines}
        resourceId={resourceId}
        setStep={setStep}
      />

      <div className="space-y-5">
        {selectedCategory?.showMaterial ? (
          <div className="space-y-2">
            <label className={FIELD_LABEL}>{dict.wizardMaterialLabel}</label>
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
              placeholder={materialCategoryId ? dict.wizardMaterialPlaceholder : undefined}
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
            <label className={FIELD_LABEL}>{dict.wizardQuantityLabel}</label>
            <DecimalInput
              value={quantityTons}
              onChange={setQuantityTons}
              placeholder={dict.wizardQuantityPlaceholder}
              className={INPUT_BASE}
            />
          </div>
        ) : null}

        {selectedCategory?.showTaskDescription ? (
          <WizardStep3DescriptionField
            dict={dict}
            isRepair={isRepair}
            required={selectedCategory.reqTaskDescription}
            taskDescription={taskDescription}
            setTaskDescription={setTaskDescription}
            repairDescription={repairDescription}
            setRepairDescription={setRepairDescription}
          />
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
        <UiButton
          type="button"
          variant="primaryLg"
          disabled={nextDisabled}
          onClick={() => setStep(4)}
        >
          {dict.wizardNext} <ChevronRight className="h-5 w-5" />
        </UiButton>
      </div>
    </div>
  );
}
