"use client";

import { useState } from "react";
import type { AppDictionary } from "@/i18n/types";
import { CategoryAdminSection } from "@/features/admin/categories/CategoryAdminSection";
import { MaterialsTable } from "@/features/admin/materials/MaterialsTable";
import { MaterialCategoryFormModal } from "@/features/admin/materials/MaterialCategoryFormModal";
import { MaterialsMaterialFormModal } from "@/features/admin/materials/MaterialsMaterialFormModal";
import { MaterialStockAdjustModal } from "@/features/admin/materials/warehouse/MaterialStockAdjustModal";
import { parseDecimalInput } from "@/lib/decimalInput";
import { materialCategoryToForm } from "@/features/admin/materials/materialCategoryForm";
import { useMaterialItemForm } from "@/features/admin/materials/useMaterialItemForm";
import {
  EMPTY_CATEGORY_FORM,
  type MaterialCategory,
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
  const [adjustMaterial, setAdjustMaterial] = useState<MaterialRow | null>(null);

  const {
    isMatModalOpen,
    setIsMatModalOpen,
    matEditId,
    matForm,
    setMatForm,
    handleMatSave,
    handleMatDelete,
    openNewMaterial,
    openEditMaterial,
  } = useMaterialItemForm({ dict, machDict, apiErrors, fetchData });

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
