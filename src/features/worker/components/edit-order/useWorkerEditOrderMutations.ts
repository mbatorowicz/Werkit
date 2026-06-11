"use client";

import { useCallback } from "react";
import type { useRouter } from "next/navigation";
import type { AppAlertOptions, AppConfirmOptions } from "@/components/AppDialogProvider";
import { appDialogApiMessage } from "@/components/AppDialogProvider";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory } from "@/types/wizard";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { buildWorkOrderFormPayloadFields } from "@/lib/workOrderCategoryFields";

type UseWorkerEditOrderMutationsArgs = {
  apiErrors: Record<string, string>;
  appAlert: (options: AppAlertOptions) => Promise<void>;
  appConfirm: (options: AppConfirmOptions) => Promise<boolean>;
  dict: AppDictionary["worker"]["client"];
  fields: {
    categoryId: string;
    resourceId: string;
    materialId: string;
    customerId: string;
    quantityTons: string;
  };
  texts: {
    taskDescription: string;
    repairDescription: string;
    dueDate: string;
    expectedDurationHours: string;
  };
  hasScheduleConflicts: boolean;
  hydratedRef: { current: boolean };
  orderId: number;
  router: ReturnType<typeof useRouter>;
  selectedCategory: WizardCategory | undefined;
  setIsLoading: (val: boolean) => void;
};

export function useWorkerEditOrderMutations(args: UseWorkerEditOrderMutationsArgs) {
  const { apiErrors, appAlert, appConfirm, dict, hasScheduleConflicts, hydratedRef } = args;
  const { orderId, router, selectedCategory, setIsLoading } = args;
  const { categoryId, resourceId, materialId, customerId, quantityTons } = args.fields;
  const { taskDescription, repairDescription, dueDate, expectedDurationHours } = args.texts;

  const buildPayload = useCallback(() => {
    const parsedDue = dueDate ? new Date(dueDate) : null;
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
    return {
      parsedDue,
      body: {
        categoryId: Number(categoryId),
        resourceId: Number(resourceId),
        ...fieldPayload,
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
    hydratedRef,
    orderId,
    router,
    setIsLoading,
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
    setIsLoading,
  ]);

  return { handleSave, handleDelete };
}
