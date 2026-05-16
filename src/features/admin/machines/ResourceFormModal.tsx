"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
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
          submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center min-w-[7rem]"
        />
      }
    >
      <form id="admin-resource-form" onSubmit={onSubmit} className="space-y-6 p-6">
        {(resourceVis.showResourceName || resourceVis.showRegistrationNumber) && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              resourceVis.showResourceName && resourceVis.showRegistrationNumber ? "sm:grid-cols-2" : "sm:grid-cols-1"
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

        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{dict.machPhotoLabel}</label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 sm:h-36 sm:w-36">
              {form.imageUrl ? (
                <Image src={form.imageUrl} alt={dict.machPhotoLabel} width={144} height={144} unoptimized className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-10 w-10 text-zinc-400" aria-hidden />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                <Camera className="h-4 w-4 text-emerald-600" />
                {dict.machPhotoChoose}
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoPick} />
              </label>
              {form.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, imageUrl: null }))}
                  className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  {dict.machPhotoRemove}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{dict.machCatLabel}</label>
          <div className="custom-scrollbar grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {categories.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(c.id)}
                  onChange={(e) => {
                    setForm((prev) => {
                      if (e.target.checked) return { ...prev, categoryIds: [...prev.categoryIds, c.id] };
                      return { ...prev, categoryIds: prev.categoryIds.filter((cid) => cid !== c.id) };
                    });
                  }}
                  className="h-4 w-4 rounded text-emerald-600"
                />
                <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{c.name}</span>
              </label>
            ))}
          </div>
          {categories.length === 0 ? <p className="text-xs text-red-400">{dict.machCatWarning}</p> : null}
        </div>

      </form>
    </AdminModalShell>
  );
}
