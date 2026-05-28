"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/i18n";
import { WorkOrder } from "@/types/worker";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
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
} from "@/lib/narrowApiListRows";
import { filterResourcesForCategory } from "@/lib/filterResourcesForCategory";

export function useWizardFlow(initialUserId?: number, initialCanCreateCustomers = false) {
  const router = useRouter();
  const { alert: appAlert } = useAppDialog();
  const dict = getDictionary().worker.client;
  const apiErrors = getDictionary().apiErrors as Record<string, string>;

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScheduleConflicts, setHasScheduleConflicts] = useState(false);
  const [userId, setUserId] = useState(initialUserId != null ? String(initialUserId) : "");

  const [categories, setCategories] = useState<WizardCategory[]>([]);
  const [machines, setMachines] = useState<WizardMachine[]>([]);
  const [materials, setMaterials] = useState<WizardMaterial[]>([]);
  const [customers, setCustomers] = useState<WizardCustomer[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  const [categoryId, setCategoryId] = useState<string>("");
  const [resourceId, setResourceId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [quantityTons, setQuantityTons] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expectedDurationHours, setExpectedDurationHours] = useState("");
  const [canCreateCustomers, setCanCreateCustomers] = useState(initialCanCreateCustomers);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cat, mac, mat, cus, ord, sess] = await Promise.all([
          fetchWithDeviceTelemetry("Worker wizard: categories", "/api/categories?leavesOnly=1", { cache: "no-store" }, {
            category: "lifecycle",
          }).then(parseJsonArray),
          fetchWithDeviceTelemetry("Worker wizard: machines", "/api/machines", { cache: "no-store" }, {
            category: "lifecycle",
          }).then(parseJsonArray),
          fetchWithDeviceTelemetry("Worker wizard: materials", "/api/materials", { cache: "no-store" }, {
            category: "lifecycle",
          }).then(parseJsonArray),
          fetchWithDeviceTelemetry("Worker wizard: customers", "/api/customers", { cache: "no-store" }, {
            category: "lifecycle",
          }).then(parseJsonArray),
          fetchWithDeviceTelemetry("Worker wizard: work-orders", "/api/worker/work-orders", { cache: "no-store" }, {
            category: "orders",
          }).then(parseJsonArray),
          fetchWithDeviceTelemetry("Worker wizard: session user", "/api/worker/session", { cache: "no-store" }, {
            category: "session",
          }).then(parseJsonUnknown),
        ]);
        if (cancelled) return;
        setCategories(narrowWizardCategories(cat));
        setMachines(narrowWizardMachines(mac));
        setMaterials(narrowWizardMaterials(mat));
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

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id.toString() === categoryId),
    [categories, categoryId],
  );

  const availableMachines = useMemo(
    () => filterResourcesForCategory(machines, selectedCategory, { whenNoCategory: true }),
    [machines, selectedCategory],
  );

  const handleStart = useCallback(async () => {
    if (hasScheduleConflicts) return;
    setIsLoading(true);
    try {
      const createPayload: Record<string, unknown> = {
        categoryId,
        resourceId,
        materialId: selectedCategory?.showMaterial ? materialId || null : null,
        customerId: selectedCategory?.showCustomer ? customerId || null : null,
        quantityTons: selectedCategory?.showQuantity ? quantityTons || null : null,
        taskDescription: selectedCategory?.showTaskDescription ? taskDescription || null : null,
        expectedDurationHours: expectedDurationHours.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      const createRes = await fetchWithDeviceTelemetry(
        "Worker wizard: create own order POST",
        "/api/worker/work-orders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        },
        { category: "orders" },
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
        createBody && typeof createBody === "object" && typeof (createBody as { orderId?: unknown }).orderId === "number"
          ? (createBody as { orderId: number }).orderId
          : null;

      if (orderId == null) {
        await appAlert({ message: apiErrors.save_error });
        setIsLoading(false);
        return;
      }

      const loc = await getCurrentPositionOnce();
      const acceptRes = await fetchWithDeviceTelemetry(
        `Worker wizard: accept order POST ${orderId}`,
        `/api/worker/work-orders/${orderId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(loc ? { latitude: loc.lat, longitude: loc.lng } : {}),
        },
        { category: "orders" },
      );

      if (acceptRes.ok) {
        router.replace("/worker");
      } else {
        const body = await parseJsonUnknown(acceptRes);
        const code = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, dict.errAcceptOrder) });
        setIsLoading(false);
      }
    } catch {
      await appAlert({ message: dict.errNetwork });
      setIsLoading(false);
    }
  }, [
    apiErrors,
    appAlert,
    categoryId,
    customerId,
    dict.errAcceptOrder,
    dict.errNetwork,
    dueDate,
    expectedDurationHours,
    hasScheduleConflicts,
    materialId,
    quantityTons,
    resourceId,
    router,
    selectedCategory,
    taskDescription,
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
          { category: "orders" },
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
    [appAlert, dict.errAcceptOrder, dict.errNetwork, router],
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
    customers,
    orders,
    categoryId,
    setCategoryId,
    resourceId,
    setResourceId,
    materialId,
    setMaterialId,
    customerId,
    setCustomerId,
    quantityTons,
    setQuantityTons,
    taskDescription,
    setTaskDescription,
    dueDate,
    setDueDate,
    expectedDurationHours,
    setExpectedDurationHours,
    hasScheduleConflicts,
    setHasScheduleConflicts,
    userId,
    selectedCategory,
    availableMachines,
    handleStart,
    handleAcceptOrder,
    canCreateCustomers,
    handleCustomerCreated,
  };
}
