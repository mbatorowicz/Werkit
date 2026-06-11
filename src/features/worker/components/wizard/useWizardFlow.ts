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
import { getCurrentPositionOnce } from "@/lib/geolocationOnce";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import {
  narrowWizardCategories,
  narrowWizardCustomers,
  narrowWizardMachines,
  narrowWizardMaterials,
  narrowWorkOrders,
  narrowMaterialCategoryRows,
} from "@/lib/narrowApiListRows";
import { filterResourcesForCategory } from "@/lib/filterResourcesForCategory";
import { isRepairOrderType } from "@/lib/orderType";
import { buildWorkOrderFormPayloadFields } from "@/lib/workOrderCategoryFields";

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
    void (async () => {
      try {
        const [cat, mac, mat, matCats, cus, ord, sess] = await Promise.all([
          fetchWithDeviceTelemetry(
            "Worker wizard: categories",
            "/api/categories?leavesOnly=1",
            { cache: "no-store" },
            {
              category: "lifecycle",
            }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker wizard: machines",
            "/api/machines",
            { cache: "no-store" },
            {
              category: "lifecycle",
            }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker wizard: materials",
            "/api/materials",
            { cache: "no-store" },
            {
              category: "lifecycle",
            }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker wizard: material-categories",
            "/api/material-categories?leavesOnly=1",
            { cache: "no-store" },
            { category: "lifecycle" }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker wizard: customers",
            "/api/customers",
            { cache: "no-store" },
            {
              category: "lifecycle",
            }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker wizard: work-orders",
            "/api/worker/work-orders",
            { cache: "no-store" },
            {
              category: "orders",
            }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker wizard: session user",
            "/api/worker/session",
            { cache: "no-store" },
            {
              category: "session",
            }
          ).then(parseJsonUnknown),
        ]);
        if (cancelled) return;
        setCategories(narrowWizardCategories(cat));
        setMachines(narrowWizardMachines(mac));
        setMaterials(narrowWizardMaterials(mat));
        setMaterialCategories(
          narrowMaterialCategoryRows(matCats).map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
          }))
        );
        setCustomers(narrowWizardCustomers(cus));
        setOrders(narrowWorkOrders(ord));
        if (sess && typeof sess === "object" && !Array.isArray(sess)) {
          const user = (sess as { user?: { id?: number; canCreateCustomers?: boolean } }).user;
          if (initialUserId == null && typeof user?.id === "number") {
            setUserId(String(user.id));
          }
          if (typeof user?.canCreateCustomers === "boolean") {
            setCanCreateCustomers(user.canCreateCustomers);
          }
        }
      } catch {
        /* sieć — zostaw puste listy */
      }
    })();
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

  const handleSave = useCallback(async () => {
    if (hasScheduleConflicts) return;
    setIsLoading(true);
    try {
      const parsedDue = dueDate ? new Date(dueDate) : null;
      if (dueDate && (!parsedDue || Number.isNaN(parsedDue.getTime()))) {
        await appAlert({ message: apiErrors.invalid_payload ?? apiErrors.save_error });
        setIsLoading(false);
        return;
      }
      const fieldPayload = buildWorkOrderFormPayloadFields(
        selectedCategory?.orderType,
        selectedCategory,
        {
          materialId,
          customerId,
          quantityTons,
          taskDescription,
          repairDescription,
        }
      );
      const createPayload: Record<string, unknown> = {
        categoryId: Number(categoryId),
        resourceId: Number(resourceId),
        ...fieldPayload,
        expectedDurationHours: expectedDurationHours.trim() || null,
        dueDate: parsedDue ? parsedDue.toISOString() : null,
      };

      const createRes = await fetchWithDeviceTelemetry(
        "Worker wizard: create own order POST",
        "/api/worker/work-orders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        },
        { category: "orders" }
      );

      if (!createRes.ok) {
        const body = await parseJsonUnknown(createRes);
        const code = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, apiErrors.save_error) });
        setIsLoading(false);
        return;
      }

      const createBody = await parseJsonUnknown(createRes);
      const orderId =
        createBody &&
        typeof createBody === "object" &&
        typeof (createBody as { orderId?: unknown }).orderId === "number"
          ? (createBody as { orderId: number }).orderId
          : null;

      if (orderId == null) {
        await appAlert({ message: apiErrors.save_error });
        setIsLoading(false);
        return;
      }

      await appAlert({ message: dict.wizardOrderSaved });
      router.replace("/worker/wizard");
    } catch {
      await appAlert({ message: dict.errNetwork });
      setIsLoading(false);
    }
  }, [
    apiErrors,
    appAlert,
    categoryId,
    customerId,
    dict.errNetwork,
    dict.wizardOrderSaved,
    dueDate,
    expectedDurationHours,
    hasScheduleConflicts,
    materialId,
    quantityTons,
    resourceId,
    router,
    selectedCategory,
    taskDescription,
    repairDescription,
  ]);

  const handleAcceptOrder = useCallback(
    async (orderId: number) => {
      setIsLoading(true);
      try {
        const loc = await getCurrentPositionOnce();
        const res = await fetchWithDeviceTelemetry(
          `Worker wizard: accept order POST ${orderId}`,
          `/api/worker/work-orders/${orderId}/accept`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loc ? { latitude: loc.lat, longitude: loc.lng } : {}),
          },
          { category: "orders" }
        );
        if (res.ok) {
          router.replace("/worker");
        } else {
          await appAlert({ message: dict.errAcceptOrder });
          setIsLoading(false);
        }
      } catch {
        await appAlert({ message: dict.errNetwork });
        setIsLoading(false);
      }
    },
    [appAlert, dict.errAcceptOrder, dict.errNetwork, router]
  );

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
