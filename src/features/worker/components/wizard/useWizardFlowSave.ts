"use client";

import { useCallback } from "react";
import type { useRouter } from "next/navigation";
import type { AppAlertOptions } from "@/components/AppDialogProvider";
import { appDialogApiMessage } from "@/components/AppDialogProvider";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory } from "@/types/wizard";
import { getCurrentPositionOnce } from "@/lib/geolocationOnce";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { buildWorkOrderFormPayloadFields } from "@/lib/workOrderCategoryFields";

export function useWizardFlowAcceptOrder(args: {
  appAlert: (options: AppAlertOptions) => Promise<void>;
  dict: AppDictionary["worker"]["client"];
  router: ReturnType<typeof useRouter>;
  setIsLoading: (val: boolean) => void;
}) {
  const { appAlert, dict, router, setIsLoading } = args;
  return useCallback(
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
    [appAlert, dict.errAcceptOrder, dict.errNetwork, router, setIsLoading]
  );
}

type UseWizardFlowSaveArgs = {
  apiErrors: Record<string, string>;
  appAlert: (options: AppAlertOptions) => Promise<void>;
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
  router: ReturnType<typeof useRouter>;
  selectedCategory: WizardCategory | undefined;
  setIsLoading: (val: boolean) => void;
};

export function useWizardFlowSave(args: UseWizardFlowSaveArgs) {
  const { apiErrors, appAlert, dict, hasScheduleConflicts, router } = args;
  const { selectedCategory, setIsLoading } = args;
  const { categoryId, resourceId, materialId, customerId, quantityTons } = args.fields;
  const { taskDescription, repairDescription, dueDate, expectedDurationHours } = args.texts;

  return useCallback(async () => {
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
    setIsLoading,
    taskDescription,
    repairDescription,
  ]);
}
