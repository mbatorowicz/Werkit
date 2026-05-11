"use client";

import { useCallback, useState } from "react";
import type { AppDictionary } from "@/i18n/types";
import { CategoryFormModal } from "@/features/admin/machines/CategoryFormModal";
import { MachinesCategoryGrid, categoryToForm } from "@/features/admin/machines/MachinesCategoryGrid";
import {
  EMPTY_CATEGORY_FORM,
  type CategoryFormState,
  type MachinesCategory,
} from "@/features/admin/machines/types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  apiErrors: Record<string, string>;
  categories: MachinesCategory[];
  isLoading: boolean;
  canMutate: boolean;
  fetchData: () => Promise<void>;
};

export function MachinesClientCategoryPanel({
  dict,
  apiErrors,
  categories,
  isLoading,
  canMutate,
  fetchData,
}: Props) {
  const [isCMOpen, setIsCMOpen] = useState(false);
  const [cEditId, setCEditId] = useState<number | null>(null);
  const [cForm, setCForm] = useState<CategoryFormState>(() => ({ ...EMPTY_CATEGORY_FORM }));

  const handleCSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = cEditId ? `/api/categories/${cEditId}` : "/api/categories";
    const method = cEditId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cForm),
      });
      if (res.ok) {
        setIsCMOpen(false);
        void fetchData();
      } else {
        const err = (await res.json()).error;
        alert(apiErrors[err] || err);
      }
    } catch {
      alert(dict.apiError);
    }
  };

  const handleCDelete = async (id: number) => {
    if (!confirm(dict.confirmCatDelete)) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()).error;
      alert(apiErrors[err] || err);
    }
  };

  const openNewCategory = useCallback(() => {
    setCEditId(null);
    setCForm({ ...EMPTY_CATEGORY_FORM });
    setIsCMOpen(true);
  }, []);

  return (
    <>
      <MachinesCategoryGrid
        dict={dict}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        onAdd={openNewCategory}
        onEdit={(cat) => {
          setCEditId(cat.id);
          setCForm(categoryToForm(cat));
          setIsCMOpen(true);
        }}
        onDelete={handleCDelete}
      />

      <CategoryFormModal
        open={isCMOpen}
        onClose={() => setIsCMOpen(false)}
        isEdit={cEditId != null}
        dict={dict}
        form={cForm}
        setForm={setCForm}
        onSubmit={handleCSave}
      />
    </>
  );
}
