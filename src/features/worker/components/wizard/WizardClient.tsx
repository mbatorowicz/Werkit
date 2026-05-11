"use client";

import { useWizardFlow } from "./useWizardFlow";
import { WizardProgressBar } from "./WizardProgressBar";
import { WizardStep1Category } from "./WizardStep1Category";
import { WizardStep2Machine } from "./WizardStep2Machine";
import { WizardStep3Details } from "./WizardStep3Details";
import { WizardStep4Summary } from "./WizardStep4Summary";

export default function WizardClient() {
  const flow = useWizardFlow();

  return (
    <div className="flex flex-col min-h-[80vh] py-6">
      <WizardProgressBar step={flow.step} />

      <div className="flex-1 w-full">
        {flow.step === 1 && (
          <WizardStep1Category
            dict={flow.dict}
            orders={flow.orders}
            categories={flow.categories}
            categoryId={flow.categoryId}
            setCategoryId={flow.setCategoryId}
            setStep={flow.setStep}
            onAcceptOrder={flow.handleAcceptOrder}
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
            customers={flow.customers}
            resourceId={flow.resourceId}
            materialId={flow.materialId}
            setMaterialId={flow.setMaterialId}
            customerId={flow.customerId}
            setCustomerId={flow.setCustomerId}
            quantityTons={flow.quantityTons}
            setQuantityTons={flow.setQuantityTons}
            taskDescription={flow.taskDescription}
            setTaskDescription={flow.setTaskDescription}
            setStep={flow.setStep}
          />
        )}
        {flow.step === 4 && (
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
            isLoading={flow.isLoading}
            onStart={flow.handleStart}
            setStep={flow.setStep}
          />
        )}
      </div>
    </div>
  );
}
