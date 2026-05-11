"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/i18n";
import { WorkOrder } from "@/types/worker";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import { getCurrentPositionOnce } from "@/lib/geolocationOnce";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import {
  narrowWizardCategories,
  narrowWizardCustomers,
  narrowWizardMachines,
  narrowWizardMaterials,
  narrowWorkOrders,
} from "@/lib/narrowApiListRows";

export function useWizardFlow() {
  const router = useRouter();
  const dict = getDictionary().worker.client;
  const apiErrors = getDictionary().apiErrors as Record<string, string>;

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cat, mac, mat, cus, ord] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }).then(parseJsonArray),
          fetch("/api/machines", { cache: "no-store" }).then(parseJsonArray),
          fetch("/api/materials", { cache: "no-store" }).then(parseJsonArray),
          fetch("/api/customers", { cache: "no-store" }).then(parseJsonArray),
          fetch("/api/worker/work-orders", { cache: "no-store" }).then(parseJsonArray),
        ]);
        if (cancelled) return;
        setCategories(narrowWizardCategories(cat));
        setMachines(narrowWizardMachines(mac));
        setMaterials(narrowWizardMaterials(mat));
        setCustomers(narrowWizardCustomers(cus));
        setOrders(narrowWorkOrders(ord));
      } catch {
        /* sieć — zostaw puste listy */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id.toString() === categoryId),
    [categories, categoryId],
  );

  const availableMachines = useMemo(() => {
    return machines.filter((m) => {
      if (!selectedCategory) return true;
      if (selectedCategory.isGlobal) return true;
      return m.categoryIds?.includes(selectedCategory.id) ?? false;
    });
  }, [machines, selectedCategory]);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/worker/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          resourceId,
          materialId: selectedCategory?.showMaterial ? (materialId || null) : null,
          customerId: selectedCategory?.showCustomer ? (customerId || null) : null,
          quantityTons: selectedCategory?.showQuantity ? (quantityTons || null) : null,
          taskDescription: selectedCategory?.showTaskDescription ? (taskDescription || null) : null,
        }),
      });

      if (res.ok) {
        router.push("/worker");
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        alert(apiErrors[code ?? ""] ?? code ?? apiErrors.save_error);
        setIsLoading(false);
      }
    } catch {
      alert(dict.errNetwork);
      setIsLoading(false);
    }
  }, [
    apiErrors,
    categoryId,
    customerId,
    dict.errNetwork,
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
        const res = await fetch(`/api/worker/work-orders/${orderId}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(loc ? { latitude: loc.lat, longitude: loc.lng } : {}),
        });
        if (res.ok) {
          router.push("/worker");
        } else {
          alert(dict.errAcceptOrder);
          setIsLoading(false);
        }
      } catch {
        alert(dict.errNetwork);
        setIsLoading(false);
      }
    },
    [dict.errAcceptOrder, dict.errNetwork, router],
  );

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
    selectedCategory,
    availableMachines,
    handleStart,
    handleAcceptOrder,
  };
}
