"use client";

import { useCallback, useState } from "react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import type { CategoryAdminVariant } from "./types";

const API_BASE: Record<CategoryAdminVariant, string> = {
  workOrders: "/api/categories",
  materials: "/api/material-categories",
};

const TELEMETRY_SCOPE: Record<CategoryAdminVariant, string> = {
  workOrders: "Admin machines: category",
  materials: "Admin materials: category",
};

type Options<TForm> = {
  variant: CategoryAdminVariant;
  apiErrors: Record<string, string>;
  apiErrorFallback: string;
  confirmDeleteMessage: string;
  createEmptyForm: () => TForm;
  fetchData: () => Promise<void>;
};

export function useCategoryAdminCrud<TForm extends object>({
  variant,
  apiErrors,
  apiErrorFallback,
  confirmDeleteMessage,
  createEmptyForm,
  fetchData,
}: Options<TForm>) {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TForm>(() => createEmptyForm());

  const apiBase = API_BASE[variant];
  const telemetry = TELEMETRY_SCOPE[variant];

  const openNew = useCallback(() => {
    setEditId(null);
    setForm(createEmptyForm());
    setIsOpen(true);
  }, [createEmptyForm]);

  const openEdit = useCallback((id: number, nextForm: TForm) => {
    setEditId(id);
    setForm(nextForm);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `${apiBase}/${editId}` : apiBase;
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetchWithDeviceTelemetry(
        editId ? `${telemetry} PUT ${editId}` : `${telemetry} POST`,
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        { category: "admin" },
      );
      if (res.ok) {
        setIsOpen(false);
        void fetchData();
      } else {
        const body = (await res.json()) as { error?: string };
        await appAlert({ message: appDialogApiMessage(apiErrors, body.error, apiErrorFallback) });
      }
    } catch {
      await appAlert({ message: apiErrorFallback });
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await appConfirm({ message: confirmDeleteMessage, variant: "danger" }))) return;
    const res = await fetchWithDeviceTelemetry(`${telemetry} DELETE ${id}`, `${apiBase}/${id}`, { method: "DELETE" }, {
      category: "admin",
    });
    if (res.ok) void fetchData();
    else {
      const body = (await res.json()) as { error?: string };
      await appAlert({ message: appDialogApiMessage(apiErrors, body.error, apiErrorFallback) });
    }
  };

  return {
    isOpen,
    editId,
    form,
    setForm,
    openNew,
    openEdit,
    close,
    handleSave,
    handleDelete,
  };
}
