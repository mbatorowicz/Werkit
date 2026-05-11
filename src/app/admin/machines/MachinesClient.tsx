"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Wrench } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { buildResourceCanonicalName } from "@/lib/resourceDisplayName";
import { CategoryFormModal } from "@/features/admin/machines/CategoryFormModal";
import { MachinesCategoryGrid, categoryToForm } from "@/features/admin/machines/MachinesCategoryGrid";
import { MachinesResourcesTable } from "@/features/admin/machines/MachinesResourcesTable";
import { ResourceFormModal } from "@/features/admin/machines/ResourceFormModal";
import { machineResourceNameForEdit } from "@/features/admin/machines/machineResourceDisplay";
import { mergeResourceFieldVisibility } from "@/features/admin/machines/resourceVisibility";
import { compressVehiclePhotoToDataUrl } from "@/features/admin/machines/vehiclePhoto";
import { useMachinesAdminData } from "@/features/admin/machines/useMachinesAdminData";
import {
  createEmptyMachineForm,
  EMPTY_CATEGORY_FORM,
  type CategoryFormState,
  type MachineFormState,
  type MachinesResource,
} from "@/features/admin/machines/types";

export default function MachinesClient() {
  const { canMutate } = useAdminAbility();
  const { machines, categories, isLoading, fetchData } = useMachinesAdminData();

  const [isMMOpen, setIsMMOpen] = useState(false);
  const [mEditId, setMEditId] = useState<number | null>(null);
  const [mForm, setMForm] = useState<MachineFormState>(() => createEmptyMachineForm());

  const [isCMOpen, setIsCMOpen] = useState(false);
  const [cEditId, setCEditId] = useState<number | null>(null);
  const [cForm, setCForm] = useState<CategoryFormState>(() => ({ ...EMPTY_CATEGORY_FORM }));

  const dictionary = getDictionary();
  const dict = dictionary.admin.machines;
  const nav = dictionary.admin.sidebar;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const resourceVis = useMemo(
    () => mergeResourceFieldVisibility(mForm.categoryIds, categories),
    [mForm.categoryIds, categories],
  );

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

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

  const handleMSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const vis = mergeResourceFieldVisibility(mForm.categoryIds, categories);
    const canonical = buildResourceCanonicalName(
      vis.showResourceName ? mForm.resourceName : "",
      "",
      vis.showRegistrationNumber ? mForm.registrationNumber : "",
      vis.showResourceDescription ? mForm.description : null,
    );
    if (!canonical.trim()) {
      alert(dict.machIdentityRequired);
      return;
    }
    const url = mEditId ? `/api/machines/${mEditId}` : "/api/machines";
    const method = mEditId ? "PUT" : "POST";
    const payload = {
      brand: vis.showResourceName ? mForm.resourceName.trim() : "",
      model: "",
      registrationNumber: mForm.registrationNumber,
      description: mForm.description,
      categoryIds: mForm.categoryIds,
      imageUrl: mForm.imageUrl,
    };
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsMMOpen(false);
        void fetchData();
      } else {
        const err = (await res.json()).error;
        alert(apiErrors[err] || err);
      }
    } catch {
      alert(dict.apiError);
    }
  };

  const handleMDelete = async (id: number) => {
    if (!confirm(dict.confirmMachDelete)) return;
    const res = await fetch(`/api/machines/${id}`, { method: "DELETE" });
    if (res.ok) void fetchData();
    else {
      const err = (await res.json()).error;
      alert(apiErrors[err] || err);
    }
  };

  const handleMachPhotoPick = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const dataUrl = await compressVehiclePhotoToDataUrl(file);
    if (!dataUrl) {
      alert(dict.apiError);
      return;
    }
    setMForm((prev) => ({ ...prev, imageUrl: dataUrl }));
  }, [dict.apiError]);

  const openNewCategory = useCallback(() => {
    setCEditId(null);
    setCForm({ ...EMPTY_CATEGORY_FORM });
    setIsCMOpen(true);
  }, []);

  const openNewResource = useCallback(() => {
    setMEditId(null);
    setMForm(createEmptyMachineForm());
    setIsMMOpen(true);
  }, []);

  const openEditResource = useCallback((machine: MachinesResource) => {
    setMEditId(machine.id);
    setMForm({
      resourceName: machineResourceNameForEdit(machine),
      registrationNumber: machine.registrationNumber ?? "",
      description: machine.description ?? "",
      categoryIds: machine.categoryIds ?? [],
      imageUrl: machine.imageUrl ?? null,
    });
    setIsMMOpen(true);
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Wrench className="h-6 w-6 text-emerald-500" />
          {nav.resources}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dict.pageSubtitle}</p>
      </div>

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

      <MachinesResourcesTable
        dict={dict}
        machines={machines}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        onAddResource={openNewResource}
        onEditResource={openEditResource}
        onDeleteResource={handleMDelete}
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

      <ResourceFormModal
        open={isMMOpen}
        onClose={() => setIsMMOpen(false)}
        isEdit={mEditId != null}
        dict={dict}
        resourceVis={resourceVis}
        categories={categories}
        form={mForm}
        setForm={setMForm}
        onSubmit={handleMSave}
        onPhotoPick={handleMachPhotoPick}
      />
    </>
  );
}
