"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/i18n";
import type {
  WizardCategory,
  WizardCustomer,
  WizardMachine,
  WizardMaterial,
  WizardMaterialCategory,
} from "@/types/wizard";
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
import { formatDueDatetimeLocal } from "@/features/admin/orders/dispatchPlanning";

function inferMaterialCategoryId(
  materialId: number | null | undefined,
  materials: WizardMaterial[]
): string {
  if (materialId == null) return "";
  const mat = materials.find((m) => m.id === materialId);
  const first = mat?.categoryIds?.[0];
  return first != null ? String(first) : "";
}

export function useWorkerEditOrder(
  orderId: number,
  initialUserId?: number,
  initialCanCreateCustomers = false
) {
  const router = useRouter();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const dict = getDictionary().worker.client;
  const apiErrors = getDictionary().apiErrors as Record<string, string>;

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
    void (async () => {
      try {
        const [cat, mac, mat, matCats, cus, orderRes, sess] = await Promise.all([
          fetchWithDeviceTelemetry(
            "Worker edit: categories",
            "/api/categories?leavesOnly=1",
            { cache: "no-store" },
            { category: "lifecycle" }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker edit: machines",
            "/api/machines",
            { cache: "no-store" },
            { category: "lifecycle" }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker edit: materials",
            "/api/materials",
            { cache: "no-store" },
            { category: "lifecycle" }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker edit: material-categories",
            "/api/material-categories?leavesOnly=1",
            { cache: "no-store" },
            { category: "lifecycle" }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            "Worker edit: customers",
            "/api/customers",
            { cache: "no-store" },
            { category: "lifecycle" }
          ).then(parseJsonArray),
          fetchWithDeviceTelemetry(
            `Worker edit: order GET ${orderId}`,
            `/api/worker/work-orders/${orderId}`,
            { cache: "no-store" },
            { category: "orders" }
          ),
          fetchWithDeviceTelemetry(
            "Worker edit: session user",
            "/api/worker/session",
            { cache: "no-store" },
            { category: "session" }
          ).then(parseJsonUnknown),
        ]);
        if (cancelled) return;

        if (!orderRes.ok) {
          const body = await parseJsonUnknown(orderRes);
          const code = readApiErrorString(body);
          setLoadError(appDialogApiMessage(apiErrors, code, apiErrors.fetch_error));
          return;
        }

        const orderRaw = await parseJsonUnknown(orderRes);
        const orders = narrowWorkOrders(orderRaw != null ? [orderRaw] : []);
        const order = orders[0];
        if (!order) {
          setLoadError(apiErrors.order_not_found ?? apiErrors.fetch_error);
          return;
        }

        const matList = narrowWizardMaterials(mat);
        setCategories(narrowWizardCategories(cat));
        setMachines(narrowWizardMachines(mac));
        setMaterials(matList);
        setMaterialCategories(
          narrowMaterialCategoryRows(matCats).map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
          }))
        );
        setCustomers(narrowWizardCustomers(cus));

        setCategoryId(String(order.categoryId));
        setResourceId(order.resourceId != null ? String(order.resourceId) : "");
        setMaterialId(order.materialId != null ? String(order.materialId) : "");
        setMaterialCategoryId(inferMaterialCategoryId(order.materialId, matList));
        setCustomerId(order.customerId != null ? String(order.customerId) : "");
        setQuantityTons(
          order.quantityTons != null && order.quantityTons > 0 ? String(order.quantityTons) : ""
        );
        setTaskDescription(order.taskDescription ?? "");
        setRepairDescription(order.repairDescription ?? "");
        setDueDate(formatDueDatetimeLocal(order.dueDate));
        setExpectedDurationHours(
          order.expectedDurationHours != null && order.expectedDurationHours > 0
            ? String(order.expectedDurationHours)
            : ""
        );
        hydratedRef.current = true;

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
        setLoadError(dict.errNetwork);
      }
    })();
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

  const buildPayload = useCallback(() => {
    const isRepair = isRepairOrderType(selectedCategory?.orderType);
    const parsedDue = dueDate ? new Date(dueDate) : null;
    return {
      isRepair,
      parsedDue,
      body: {
        categoryId: Number(categoryId),
        resourceId: Number(resourceId),
        materialId:
          !isRepair && selectedCategory?.showMaterial ? materialId || null : null,
        customerId: selectedCategory?.showCustomer ? customerId || null : null,
        quantityTons:
          !isRepair && selectedCategory?.showQuantity ? quantityTons || null : null,
        taskDescription:
          !isRepair && selectedCategory?.showTaskDescription ? taskDescription || null : null,
        repairDescription: isRepair ? repairDescription.trim() || null : null,
        expectedDurationHours: expectedDurationHours.trim() || null,
        dueDate: parsedDue && !Number.isNaN(parsedDue.getTime()) ? parsedDue.toISOString() : null,
      } as Record<string, unknown>,
    };
  }, [
    categoryId,
    customerId,
    dueDate,
    expectedDurationHours,
    materialId,
    quantityTons,
    repairDescription,
    resourceId,
    selectedCategory,
    taskDescription,
  ]);

  const handleSave = useCallback(async () => {
    if (hasScheduleConflicts || !hydratedRef.current) return;
    const { parsedDue, body } = buildPayload();
    if (dueDate && (!parsedDue || Number.isNaN(parsedDue.getTime()))) {
      await appAlert({ message: apiErrors.invalid_payload ?? apiErrors.save_error });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker edit: order PUT ${orderId}`,
        `/api/worker/work-orders/${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        { category: "orders" }
      );
      if (!res.ok) {
        const errBody = await parseJsonUnknown(res);
        const code = readApiErrorString(errBody);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, apiErrors.save_error) });
        setIsLoading(false);
        return;
      }
      await appAlert({ message: dict.editOrderSaved });
      router.replace("/worker");
    } catch {
      await appAlert({ message: dict.errNetwork });
      setIsLoading(false);
    }
  }, [
    apiErrors,
    appAlert,
    buildPayload,
    dict.editOrderSaved,
    dict.errNetwork,
    dueDate,
    hasScheduleConflicts,
    orderId,
    router,
  ]);

  const handleDelete = useCallback(async () => {
    if (!(await appConfirm({ message: dict.deleteOwnOrderConfirm, variant: "danger" }))) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker edit: order DELETE ${orderId}`,
        `/api/worker/work-orders/${orderId}`,
        { method: "DELETE" },
        { category: "orders" }
      );
      if (!res.ok) {
        const errBody = await parseJsonUnknown(res);
        const code = readApiErrorString(errBody);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, apiErrors.delete_error) });
        setIsLoading(false);
        return;
      }
      await appAlert({ message: dict.editOrderDeleted });
      router.replace("/worker");
    } catch {
      await appAlert({ message: dict.errNetwork });
      setIsLoading(false);
    }
  }, [
    apiErrors,
    appAlert,
    appConfirm,
    dict.deleteOwnOrderConfirm,
    dict.editOrderDeleted,
    dict.errNetwork,
    orderId,
    router,
  ]);

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
