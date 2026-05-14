"use client";

import type { ChangeEvent } from "react";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { buildResourceCanonicalName } from "@/lib/resourceDisplayName";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { ResourceFormModal } from "@/features/admin/machines/ResourceFormModal";
import { machineResourceNameForEdit } from "@/features/admin/machines/machineResourceDisplay";
import { mergeResourceFieldVisibility } from "@/features/admin/machines/resourceVisibility";
import { compressVehiclePhotoToDataUrl } from "@/features/admin/machines/vehiclePhoto";
import {
  createEmptyMachineForm,
  type MachineFormState,
  type MachinesCategory,
  type MachinesResource,
} from "@/features/admin/machines/types";
import type { AppDictionary } from "@/i18n/types";

type Dict = AppDictionary["admin"]["machines"];

export type MachinesClientMachineFormHandle = {
  openNew: () => void;
  openEdit: (machine: MachinesResource) => void;
};

type Props = {
  dict: Dict;
  apiErrors: Record<string, string>;
  categories: MachinesCategory[];
  fetchData: () => Promise<void>;
};

export const MachinesClientMachineFormPanel = forwardRef<MachinesClientMachineFormHandle, Props>(
  function MachinesClientMachineFormPanel({ dict, apiErrors, categories, fetchData }, ref) {
    const [isMMOpen, setIsMMOpen] = useState(false);
    const [mEditId, setMEditId] = useState<number | null>(null);
    const [mForm, setMForm] = useState<MachineFormState>(() => createEmptyMachineForm());

    const resourceVis = useMemo(
      () => mergeResourceFieldVisibility(mForm.categoryIds, categories),
      [mForm.categoryIds, categories],
    );

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
        const res = await fetchWithDeviceTelemetry(
          mEditId ? `Admin machines: save machine PUT ${mEditId}` : "Admin machines: save machine POST",
          url,
          {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          { category: "admin" },
        );
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

    const handleMachPhotoPick = useCallback(
      async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const dataUrl = await compressVehiclePhotoToDataUrl(file);
        if (!dataUrl) {
          alert(dict.apiError);
          return;
        }
        setMForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      },
      [dict.apiError],
    );

    useImperativeHandle(ref, () => ({
      openNew: () => {
        setMEditId(null);
        setMForm(createEmptyMachineForm());
        setIsMMOpen(true);
      },
      openEdit: (machine: MachinesResource) => {
        setMEditId(machine.id);
        setMForm({
          resourceName: machineResourceNameForEdit(machine),
          registrationNumber: machine.registrationNumber ?? "",
          description: machine.description ?? "",
          categoryIds: machine.categoryIds ?? [],
          imageUrl: machine.imageUrl ?? null,
        });
        setIsMMOpen(true);
      },
    }));

    return (
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
    );
  },
);
