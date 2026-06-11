"use client";

import { useState, type FormEvent } from "react";
import type { AppDictionary } from "@/i18n/types";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import {
  EMPTY_MATERIAL_FORM,
  type MaterialItemFormState,
  type MaterialRow,
} from "@/features/admin/materials/types";

interface UseMaterialItemFormArgs {
  dict: AppDictionary["admin"]["materials"];
  machDict: AppDictionary["admin"]["machines"];
  apiErrors: Record<string, string>;
  fetchData: () => Promise<void>;
}

export function useMaterialItemForm({
  dict,
  machDict,
  apiErrors,
  fetchData,
}: UseMaterialItemFormArgs) {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();

  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matEditId, setMatEditId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MaterialItemFormState>(() => ({ ...EMPTY_MATERIAL_FORM }));

  const handleMatSave = async (e: FormEvent) => {
    e.preventDefault();
    if (matForm.categoryIds.length === 0) {
      await appAlert({ message: dict.matCatRequired });
      return;
    }
    const url = matEditId ? `/api/materials/${matEditId}` : "/api/materials";
    const method = matEditId ? "PUT" : "POST";
    try {
      const res = await fetchWithDeviceTelemetry(
        matEditId
          ? `Admin materials: save material PUT ${matEditId}`
          : "Admin materials: save material POST",
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: matForm.name,
            categoryIds: matForm.categoryIds,
            unit: matForm.unit,
            minStock: matForm.minStock.trim() || null,
            location: matForm.location.trim() || null,
          }),
        },
        { category: "admin" }
      );
      if (res.ok) {
        setIsMatModalOpen(false);
        void fetchData();
      } else {
        const err = (await res.json()) as { error?: string };
        await appAlert({ message: appDialogApiMessage(apiErrors, err.error, machDict.apiError) });
      }
    } catch {
      await appAlert({ message: machDict.apiError });
    }
  };

  const handleMatDelete = async (id: number) => {
    if (!(await appConfirm({ message: dict.confirmDelete, variant: "danger" }))) return;
    const res = await fetchWithDeviceTelemetry(
      `Admin materials: delete material ${id}`,
      `/api/materials/${id}`,
      { method: "DELETE" },
      { category: "admin" }
    );
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()) as { error?: string };
      await appAlert({ message: appDialogApiMessage(apiErrors, err.error, machDict.apiError) });
    }
  };

  const openNewMaterial = () => {
    setMatEditId(null);
    setMatForm({ ...EMPTY_MATERIAL_FORM });
    setIsMatModalOpen(true);
  };

  const openEditMaterial = (material: MaterialRow) => {
    setMatEditId(material.id);
    setMatForm({
      name: material.name,
      categoryIds: material.categoryIds ?? [],
      unit: material.unit,
      minStock: material.minStock ?? "",
      location: material.location ?? "",
    });
    setIsMatModalOpen(true);
  };

  return {
    isMatModalOpen,
    setIsMatModalOpen,
    matEditId,
    matForm,
    setMatForm,
    handleMatSave,
    handleMatDelete,
    openNewMaterial,
    openEditMaterial,
  };
}
