"use client";

import type { ChangeEvent } from "react";
import type { AppDictionary } from "@/i18n/types";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { cn } from "@/lib/cn";
import { INPUT_BASE, SELECT_BASE, TEXTAREA_BASE } from "@/lib/uiTokens";
import { FIELD_LABEL } from "@/lib/uiTypography";
import { ResourceFormCategoriesField } from "./ResourceFormCategoriesField";
import { ResourceFormPhotoField } from "./ResourceFormPhotoField";
import type { MachineFormState, MachinesCategory } from "./types";
import type { ResourceFieldVisibility } from "./resourceVisibility";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  dict: Dict;
  resourceVis: ResourceFieldVisibility;
  categories: MachinesCategory[];
  resourceGroups: { id: number; name: string }[];
  form: MachineFormState;
  setForm: React.Dispatch<React.SetStateAction<MachineFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onPhotoPick: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function ResourceFormModal({
  open,
  onClose,
  isEdit,
  dict,
  resourceVis,
  categories,
  resourceGroups,
  form,
  setForm,
  onSubmit,
  onPhotoPick,
}: Props) {
  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? dict.modalMachEditTitle : dict.modalMachCreateTitle}
      maxWidthClass="max-w-2xl"
      titleSize="lg"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="admin-resource-form"
          onCancel={onClose}
          submitLabel={dict.saveFleet}
          submitDisabled={categories.length === 0}
        />
      }
    >
      <form id="admin-resource-form" onSubmit={onSubmit} className="space-y-6 p-6">
        {(resourceVis.showResourceName || resourceVis.showRegistrationNumber) && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              resourceVis.showResourceName && resourceVis.showRegistrationNumber
                ? "sm:grid-cols-2"
                : "sm:grid-cols-1"
            }`}
          >
            {resourceVis.showResourceName ? (
              <div className="space-y-2">
                <label className={FIELD_LABEL}>{dict.machNameLabel}</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder={dict.machNamePlaceholder}
                  value={form.resourceName}
                  onChange={(e) => setForm({ ...form, resourceName: e.target.value })}
                  className={INPUT_BASE}
                />
              </div>
            ) : null}
            {resourceVis.showRegistrationNumber ? (
              <div className="space-y-2">
                <label className={FIELD_LABEL}>{dict.machRegLabel}</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder={dict.machRegPlaceholder}
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                  className={cn(INPUT_BASE, "uppercase tracking-wide")}
                />
              </div>
            ) : null}
          </div>
        )}
        {resourceVis.showResourceDescription ? (
          <div className="space-y-2">
            <label className={FIELD_LABEL}>{dict.machDescLabel}</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={dict.machDescPlaceholder}
              className={TEXTAREA_BASE}
            />
          </div>
        ) : null}

        <ResourceFormPhotoField
          dict={dict}
          imageUrl={form.imageUrl}
          onPhotoPick={onPhotoPick}
          onPhotoRemove={() => setForm((prev) => ({ ...prev, imageUrl: null }))}
        />

        <div className="space-y-2">
          <label htmlFor="admin-resource-group" className={FIELD_LABEL}>
            {dict.resourceGroupLabel}
          </label>
          <select
            id="admin-resource-group"
            value={form.resourceGroupId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                resourceGroupId: e.target.value ? Number(e.target.value) : null,
              })
            }
            className={SELECT_BASE}
          >
            <option value="">{dict.resourceGroupNone}</option>
            {resourceGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-zinc-500">{dict.resourceGroupHint}</p>
        </div>

        <ResourceFormCategoriesField
          dict={dict}
          categories={categories}
          form={form}
          setForm={setForm}
        />
      </form>
    </AdminModalShell>
  );
}
