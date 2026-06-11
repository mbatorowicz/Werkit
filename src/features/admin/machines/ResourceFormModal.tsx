"use client";

import type { ChangeEvent } from "react";
import type { AppDictionary } from "@/i18n/types";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
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
  durEnabled?: boolean;
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
  durEnabled = false,
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
                <label className="text-sm font-medium text-zinc-400">{dict.machNameLabel}</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder={dict.machNamePlaceholder}
                  value={form.resourceName}
                  onChange={(e) => setForm({ ...form, resourceName: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            ) : null}
            {resourceVis.showRegistrationNumber ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{dict.machRegLabel}</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder={dict.machRegPlaceholder}
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 uppercase tracking-wide text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            ) : null}
          </div>
        )}
        {resourceVis.showResourceDescription ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.machDescLabel}</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={dict.machDescPlaceholder}
              className="min-h-[88px] w-full resize-y rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </div>
        ) : null}

        <ResourceFormPhotoField
          dict={dict}
          imageUrl={form.imageUrl}
          onPhotoPick={onPhotoPick}
          onPhotoRemove={() => setForm((prev) => ({ ...prev, imageUrl: null }))}
        />

        {durEnabled ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {dict.resourceGroupLabel}
            </label>
            <select
              value={form.resourceGroupId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  resourceGroupId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
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
        ) : null}

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
