"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/i18n";
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
import { loadWorkerEditOrder } from "@/features/worker/components/edit-order/workerEditOrderLoad";
import { useWorkerEditOrderMutations } from "@/features/worker/components/edit-order/useWorkerEditOrderMutations";

export function useWorkerEditOrder(
  orderId: number,
  initialUserId?: number,
  initialCanCreateCustomers = false
) {
  const router = useRouter();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const dictionary = useDictionary();
  const dict = dictionary.worker.client;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasScheduleConflicts, setHasScheduleConflicts] = useState(false);
  const [userId, setUserId] = useState(initialUserId != null ? String(initialUserId) : "");
  const hydratedRef = useRef(false);

  const [categories, setCategories] = useState<WizardCategory[]>([]);
  const [machines, setMachines] = useState<WizardMachine[]>([]);
  const [materials, setMaterials] = useState<WizardMaterial[]>([]);
  const [materialCategories, setMaterialCategories] = useState<WizardMaterialCategory[]>([]);
  const [customers, setCustomers] = useState<WizardCustomer[]>([]);

  const [categoryId, setCategoryId] = useState("");
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
    void loadWorkerEditOrder(orderId, initialUserId, {
      apiErrors,
      errNetwork: dict.errNetwork,
      isCancelled: () => cancelled,
      hydratedRef,
      setLoadError,
      setUserId,
      setCanCreateCustomers,
      lists: { setCategories, setMachines, setMaterials, setMaterialCategories, setCustomers },
      ids: { setCategoryId, setResourceId, setMaterialId, setMaterialCategoryId, setCustomerId },
      details: { setQuantityTons, setTaskDescription, setRepairDescription },
      schedule: { setDueDate, setExpectedDurationHours },
    });
    return () => {
      cancelled = true;
    };
  }, [apiErrors, dict.errNetwork, initialUserId, orderId]);

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

  const { handleSave, handleDelete } = useWorkerEditOrderMutations({
    apiErrors,
    appAlert,
    appConfirm,
    dict,
    fields: { categoryId, resourceId, materialId, customerId, quantityTons },
    texts: { taskDescription, repairDescription, dueDate, expectedDurationHours },
    hasScheduleConflicts,
    hydratedRef,
    orderId,
    router,
    selectedCategory,
    setIsLoading,
  });

  const handleCustomerCreated = useCallback((customer: WizardCustomer) => {
    setCustomers((prev) => [...prev.filter((c) => c.id !== customer.id), customer]);
  }, []);

  return {
    step,
    setStep,
    isLoading,
    loadError,
    dict,
    categories,
    machines,
    materials,
    materialCategories,
    customers,
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
    handleDelete,
    canCreateCustomers,
    handleCustomerCreated,
    orderId,
  };
}
