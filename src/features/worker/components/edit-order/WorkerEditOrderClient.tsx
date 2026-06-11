"use client";

import { Trash2 } from "lucide-react";
import { formatDict } from "@/i18n";
import { useWorkerEditOrder } from "./useWorkerEditOrder";
import { WizardProgressBar } from "../wizard/WizardProgressBar";
import { WizardStep1Category } from "../wizard/WizardStep1Category";
import { WizardStep2Machine } from "../wizard/WizardStep2Machine";
import { WizardStep3Details } from "../wizard/WizardStep3Details";
import { WizardStep4Schedule } from "../wizard/WizardStep4Schedule";
import { WizardStep4Summary } from "../wizard/WizardStep4Summary";

export default function WorkerEditOrderClient({
  orderId,
  userId,
  canCreateCustomers: initialCanCreateCustomers = false,
}: {
  orderId: number;
  userId?: number;
  canCreateCustomers?: boolean;
}) {
  const flow = useWorkerEditOrder(orderId, userId, initialCanCreateCustomers);

  if (flow.loadError) {
    return (
      <p className="px-4 text-sm font-medium text-red-700 dark:text-red-400">{flow.loadError}</p>
    );
  }

  return (
    <div className="flex flex-col min-h-[80vh] py-6">
      <div className="px-4 mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          {flow.dict.editOrderTitle}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {formatDict(flow.dict.editOrderSubtitle, { id: flow.orderId })}
        </p>
      </div>

      <WizardProgressBar step={flow.step} />

      <div className="flex-1 w-full">
        {flow.step === 1 && (
          <WizardStep1Category
            dict={flow.dict}
            orders={[]}
            categories={flow.categories}
            categoryId={flow.categoryId}
            setCategoryId={flow.applyCategoryChange}
            setStep={flow.setStep}
          />
        )}
        {flow.step === 2 && (
          <WizardStep2Machine
            dict={flow.dict}
            selectedCategory={flow.selectedCategory}
            availableMachines={flow.availableMachines}
            resourceId={flow.resourceId}
            setResourceId={flow.setResourceId}
            setStep={flow.setStep}
          />
        )}
        {flow.step === 3 && (
          <WizardStep3Details
            dict={flow.dict}
            selectedCategory={flow.selectedCategory}
            machines={flow.machines}
            materials={flow.materials}
            materialCategories={flow.materialCategories}
            customers={flow.customers}
            resourceId={flow.resourceId}
            materialCategoryId={flow.materialCategoryId}
            setMaterialCategoryId={flow.setMaterialCategoryId}
            materialId={flow.materialId}
            setMaterialId={flow.setMaterialId}
            customerId={flow.customerId}
            setCustomerId={flow.setCustomerId}
            quantityTons={flow.quantityTons}
            setQuantityTons={flow.setQuantityTons}
            taskDescription={flow.taskDescription}
            setTaskDescription={flow.setTaskDescription}
            repairDescription={flow.repairDescription}
            setRepairDescription={flow.setRepairDescription}
            setStep={flow.setStep}
            canCreateCustomers={flow.canCreateCustomers}
            onCustomerCreated={flow.handleCustomerCreated}
          />
        )}
        {flow.step === 4 && (
          <WizardStep4Schedule
            dict={flow.dict}
            selectedCategory={flow.selectedCategory}
            machines={flow.machines}
            resourceId={flow.resourceId}
            userId={flow.userId}
            dueDate={flow.dueDate}
            setDueDate={flow.setDueDate}
            expectedDurationHours={flow.expectedDurationHours}
            setExpectedDurationHours={flow.setExpectedDurationHours}
            hasConflicts={flow.hasScheduleConflicts}
            setHasConflicts={flow.setHasScheduleConflicts}
            setStep={flow.setStep}
            excludeOrderId={flow.orderId}
          />
        )}
        {flow.step === 5 && (
          <>
            <WizardStep4Summary
              dict={flow.dict}
              selectedCategory={flow.selectedCategory}
              machines={flow.machines}
              materials={flow.materials}
              customers={flow.customers}
              materialId={flow.materialId}
              customerId={flow.customerId}
              quantityTons={flow.quantityTons}
              resourceId={flow.resourceId}
              taskDescription={flow.taskDescription}
              repairDescription={flow.repairDescription}
              dueDate={flow.dueDate}
              expectedDurationHours={flow.expectedDurationHours}
              hasScheduleConflicts={flow.hasScheduleConflicts}
              isLoading={flow.isLoading}
              onSave={flow.handleSave}
              setStep={flow.setStep}
              saveLabel={flow.dict.editOrderSave}
            />
            <div className="px-4 pb-8 max-w-lg mx-auto w-full">
              <button
                type="button"
                disabled={flow.isLoading}
                onClick={() => void flow.handleDelete()}
                className="w-full mt-4 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 py-3 px-4 flex items-center justify-center gap-2 text-red-800 dark:text-red-300 font-semibold text-sm uppercase tracking-wider transition-colors hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {flow.dict.deleteOrder}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
