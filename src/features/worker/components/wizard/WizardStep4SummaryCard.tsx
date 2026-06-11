"use client";

import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";

type Dict = AppDictionary["worker"]["client"];

function summaryRowVisibility(
  selectedCategory: WizardCategory | undefined,
  materialId: string,
  quantityTons: string,
  summaryDescription: string | null,
  customerId: string
) {
  return {
    material: Boolean(selectedCategory?.showMaterial && materialId),
    quantity: Boolean(selectedCategory?.showQuantity && quantityTons),
    description: Boolean(selectedCategory?.showTaskDescription && summaryDescription),
    customer: Boolean(selectedCategory?.showCustomer && customerId),
  };
}

export function WizardStep4SummaryCard({
  dict,
  selectedCategory,
  machines,
  materials,
  customers,
  materialId,
  customerId,
  quantityTons,
  resourceId,
  isRepair,
  summaryDescription,
  dueDate,
  expectedDurationHours,
}: {
  dict: Dict;
  selectedCategory: WizardCategory | undefined;
  machines: WizardMachine[];
  materials: WizardMaterial[];
  customers: WizardCustomer[];
  materialId: string;
  customerId: string;
  quantityTons: string;
  resourceId: string;
  isRepair: boolean;
  summaryDescription: string | null;
  dueDate: string;
  expectedDurationHours: string;
}) {
  const vis = summaryRowVisibility(
    selectedCategory,
    materialId,
    quantityTons,
    summaryDescription,
    customerId
  );
  return (
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
      {vis.material ? (
        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <span className="text-zinc-500 text-sm">{dict.wizardSummaryAggregate}</span>
          <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[150px] text-right">
            {materials.find((m) => m.id.toString() === materialId)?.name}
          </span>
        </div>
      ) : null}
      {vis.quantity ? (
        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <span className="text-zinc-500 text-sm">{dict.wizardQuantityLabel}</span>
          <span className="text-zinc-900 dark:text-white font-medium">{quantityTons}t</span>
        </div>
      ) : null}
      {vis.description ? (
        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3 gap-4">
          <span className="text-zinc-500 text-sm shrink-0">
            {isRepair ? dict.repairDescription : dict.wizardDescLabel}
          </span>
          <span className="text-zinc-900 dark:text-white font-medium text-right text-sm whitespace-pre-wrap">
            {summaryDescription}
          </span>
        </div>
      ) : null}
      {vis.customer ? (
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
  );
}
