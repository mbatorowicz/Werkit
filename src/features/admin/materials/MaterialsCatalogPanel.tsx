"use client";

import { useState } from "react";
import type { AppDictionary } from "@/i18n/types";
import { CategoryAdminSection } from "@/features/admin/categories/CategoryAdminSection";
import { MaterialsTable } from "@/features/admin/materials/MaterialsTable";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { MaterialCategoryFormModal } from "@/features/admin/materials/MaterialCategoryFormModal";
import { MaterialsMaterialFormModal } from "@/features/admin/materials/MaterialsMaterialFormModal";
import { MaterialStockAdjustModal } from "@/features/admin/materials/warehouse/MaterialStockAdjustModal";
import { parseDecimalInput } from "@/lib/decimalInput";
import { materialCategoryToForm } from "@/features/admin/materials/materialCategoryForm";
import {
  EMPTY_CATEGORY_FORM,
  EMPTY_MATERIAL_FORM,
  type MaterialCategory,
  type MaterialItemFormState,
  type MaterialRow,
} from "@/features/admin/materials/types";

type Dict = AppDictionary["admin"]["materials"];
type SharedDict = AppDictionary["admin"]["shared"];
type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  sharedDict: SharedDict;
  machDict: MachDict;
  apiErrors: Record<string, string>;
  categories: MaterialCategory[];
  materials: MaterialRow[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function MaterialsCatalogPanel({
  dict,
  sharedDict,
  machDict,
  apiErrors,
  categories,
  materials,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();

  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matEditId, setMatEditId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MaterialItemFormState>(() => ({ ...EMPTY_MATERIAL_FORM }));
  const [adjustMaterial, setAdjustMaterial] = useState<MaterialRow | null>(null);

  const handleMatSave = async (e: React.FormEvent) => {
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

  return (
    <>
      <CategoryAdminSection
        variant="materials"
        apiErrors={apiErrors}
        apiErrorFallback={machDict.apiError}
        items={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        fetchData={fetchData}
        createEmptyForm={() => ({ ...EMPTY_CATEGORY_FORM })}
        itemToForm={materialCategoryToForm}
        renderModal={({
          open,
          onClose,
          isEdit,
          editId,
          form,
          setForm,
          categories: tree,
          onSubmit,
        }) => (
          <MaterialCategoryFormModal
            open={open}
            onClose={onClose}
            isEdit={isEdit}
            categories={tree}
            editId={editId}
            form={form}
            setForm={setForm}
            onSubmit={onSubmit}
          />
        )}
      />

      <MaterialsTable
        dict={dict}
        machDict={machDict}
        materials={materials}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        onAddMaterial={openNewMaterial}
        onEditMaterial={openEditMaterial}
        onDeleteMaterial={handleMatDelete}
        onAdjustStock={canMutate ? (m) => setAdjustMaterial(m) : undefined}
        isLowStock={(m) => {
          const min = parseDecimalInput(m.minStock ?? "");
          const stock = parseDecimalInput(m.stockQuantity ?? "0") ?? 0;
          return min != null && min > 0 && stock < min;
        }}
      />

      <MaterialsMaterialFormModal
        open={isMatModalOpen}
        onClose={() => setIsMatModalOpen(false)}
        isEdit={matEditId != null}
        dict={dict}
        sharedDict={sharedDict}
        machDict={machDict}
        categories={categories}
        form={matForm}
        setForm={setMatForm}
        onSubmit={handleMatSave}
      />

      <MaterialStockAdjustModal
        open={adjustMaterial != null}
        material={adjustMaterial}
        apiErrors={apiErrors}
        onClose={() => setAdjustMaterial(null)}
        onSaved={() => void fetchData()}
      />
    </>
  );
}
