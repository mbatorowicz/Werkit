"use client";

import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import type { AppDictionary } from "@/i18n/types";
import type { OrderFormState } from "@/types/admin";
import {
  handleDeleteWorkOrder,
  handleForceCompleteSession,
  handleDeleteArchivedSession,
} from "./OrdersMutations";

type UseOrdersActionsParams = {
  dict: AppDictionary["admin"]["orders"];
  apiErrors: Record<string, string>;
  editingOrderId: number | null;
  closeOrderModal: () => void;
  closeSessionDetails: () => void;
  fetchData: (showLoader?: boolean) => void | Promise<void>;
};

export function useOrdersActions({
  dict,
  apiErrors,
  editingOrderId,
  closeOrderModal,
  closeSessionDetails,
  fetchData,
}: UseOrdersActionsParams) {
  const { alert: appAlert } = useAppDialog();

  const onDeleteWorkOrder = async (orderId: number) => {
    await handleDeleteWorkOrder(orderId, appAlert, apiErrors, dict, fetchData);
  };

  const onForceCompleteSession = async (sessionId: number) => {
    await handleForceCompleteSession(
      sessionId,
      appAlert,
      apiErrors,
      dict,
      closeSessionDetails,
      fetchData
    );
  };

  const onDeleteArchivedSession = async (sessionId: number, adminPassword: string) => {
    await handleDeleteArchivedSession(
      sessionId,
      adminPassword,
      appAlert,
      apiErrors,
      dict,
      closeSessionDetails,
      fetchData
    );
  };

  const handleSaveOrder = async (formData: OrderFormState, options?: { forceSave?: boolean }) => {
    const url = editingOrderId
      ? `/api/admin/work-orders/${editingOrderId}`
      : "/api/admin/work-orders";
    const method = editingOrderId ? "PUT" : "POST";
    const { materialCategoryId: _materialCategoryId, ...rest } = formData;
    const payload = { ...rest, forceSave: Boolean(options?.forceSave) };
    if (payload.dueDate) {
      const due = new Date(payload.dueDate);
      payload.dueDate = Number.isNaN(due.getTime()) ? "" : due.toISOString();
    }
    const res = await fetchWithDeviceTelemetry(
      editingOrderId ? `Admin orders: save PUT ${editingOrderId}` : "Admin orders: save POST",
      url,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { category: "admin" }
    );
    if (res.ok) {
      await appAlert({ message: dict.success });
      closeOrderModal();
      fetchData(true);
    } else if (res.status === 409) {
      /* Konflikt harmonogramu — panel inline w modalu; bez dodatkowego alertu. */
    } else {
      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      await appAlert({ message: appDialogApiMessage(apiErrors, code, dict.error) });
    }
  };

  return {
    onDeleteWorkOrder,
    onForceCompleteSession,
    onDeleteArchivedSession,
    handleSaveOrder,
  };
}
