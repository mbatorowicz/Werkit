"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/i18n";
import { WorkOrder } from "@/types/worker";
import type {
  WizardCategory,
  WizardCustomer,
  WizardMachine,
  WizardMaterial,
  WizardMaterialCategory,
} from "@/types/wizard";
import { useAppDialog } from "@/components/AppDialogProvider";
import { filterResourcesForCategory } from "@/lib/filterResourcesForCategory";
import { isRepairOrderType } from "@/lib/orderType";
import { loadWizardFlowData } from "@/features/worker/components/wizard/wizardFlowLoad";
import {
  useWizardFlowAcceptOrder,
  useWizardFlowSave,
} from "@/features/worker/components/wizard/useWizardFlowSave";

export function useWizardFlow(initialUserId?: number, initialCanCreateCustomers = false) {
  const router = useRouter();
  const { alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const dict = dictionary.worker.client;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScheduleConflicts, setHasScheduleConflicts] = useState(false);
  const [userId, setUserId] = useState(initialUserId != null ? String(initialUserId) : "");

  const [categories, setCategories] = useState<WizardCategory[]>([]);
  const [machines, setMachines] = useState<WizardMachine[]>([]);
  const [materials, setMaterials] = useState<WizardMaterial[]>([]);
  const [materialCategories, setMaterialCategories] = useState<WizardMaterialCategory[]>([]);
  const [customers, setCustomers] = useState<WizardCustomer[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  const [categoryId, setCategoryId] = useState<string>("");
  const [resourceId, setResourceId] = useState("");
  const [materialCategoryId, setMaterialCategoryId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [quantityTons, setQuantityTons] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expectedDurationHours, setExpectedDurationHours] = useState("");
  const [canCreateCustomers, setCanCreateCustomers] = useState(initialCanCreateCustomers);

  useEffect(() => {
    let cancelled = false;
    void loadWizardFlowData(initialUserId, {
      isCancelled: () => cancelled,
      lists: { setCategories, setMachines, setMaterials, setMaterialCategories, setCustomers },
      setOrders,
      setUserId,
      setCanCreateCustomers,
    });
    return () => {
      cancelled = true;
    };
  }, [initialUserId]);

  const applyCategoryChange = useCallback(
    (id: string) => {
      const cat = categories.find((c) => String(c.id) === id);
      const nextRepair = isRepairOrderType(cat?.orderType);
      setCategoryId(id);
      setResourceId("");
      setMaterialCategoryId("");
      setMaterialId("");
      if (nextRepair) {
        setQuantityTons("");
      }
    },
    [categories]
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id.toString() === categoryId),
    [categories, categoryId]
  );

  const availableMachines = useMemo(
    () => filterResourcesForCategory(machines, selectedCategory, { whenNoCategory: true }),
    [machines, selectedCategory]
  );

  const handleSave = useWizardFlowSave({
    apiErrors,
    appAlert,
    dict,
    fields: { categoryId, resourceId, materialId, customerId, quantityTons },
    texts: { taskDescription, repairDescription, dueDate, expectedDurationHours },
    hasScheduleConflicts,
    router,
    selectedCategory,
    setIsLoading,
  });

  const handleAcceptOrder = useWizardFlowAcceptOrder({ appAlert, dict, router, setIsLoading });

  const handleCustomerCreated = useCallback((customer: WizardCustomer) => {
    setCustomers((prev) => [...prev.filter((c) => c.id !== customer.id), customer]);
  }, []);

  return {
    step,
    setStep,
    isLoading,
    dict,
    categories,
    machines,
    materials,
    materialCategories,
    customers,
    orders,
    categoryId,
    setCategoryId,
    applyCategoryChange,
    resourceId,
    setResourceId,
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
    dueDate,
    setDueDate,
    expectedDurationHours,
    setExpectedDurationHours,
    hasScheduleConflicts,
    setHasScheduleConflicts,
    userId,
    selectedCategory,
    availableMachines,
    handleSave,
    handleAcceptOrder,
    canCreateCustomers,
    handleCustomerCreated,
  };
}
