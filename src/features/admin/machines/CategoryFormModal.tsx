"use client";

import type { AppDictionary } from "@/i18n/types";
import { AdminCategoryColorFieldRow } from "@/components/Admin/AdminCategoryColorFieldRow";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import type { CategoryFormState } from "./types";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  dict: Dict;
  form: CategoryFormState;
  setForm: React.Dispatch<React.SetStateAction<CategoryFormState>>;
  onSubmit: (e: React.FormEvent) => void;
};

export function CategoryFormModal({ open, onClose, isEdit, dict, form, setForm, onSubmit }: Props) {
  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? dict.modalCatEditTitle : dict.modalCatCreateTitle}
      maxWidthClass="max-w-sm"
      titleSize="sm"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="admin-machine-category-form"
          onCancel={onClose}
          submitLabel={dict.saveDict}
          submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition flex items-center justify-center min-w-[7rem]"
        />
      }
    >
      <form id="admin-machine-category-form" onSubmit={onSubmit} className="space-y-4 p-6">
        <input
          required
          type="text"
          placeholder={dict.catPlaceholder}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
        <AdminCategoryColorFieldRow
          color={form.color}
          onColorChange={(color) => setForm({ ...form, color })}
          label={dict.catColorLabel}
          hint={dict.catColorHint}
        />

        <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dict.catMobilityTitle}</h3>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5 pr-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{dict.isStationaryLabel}</label>
              <span className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">{dict.isStationaryDesc}</span>
            </div>
            <input
              type="checkbox"
              checked={form.isStationary}
              onChange={(e) => setForm({ ...form, isStationary: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded text-emerald-600"
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dict.catResourceFormTitle}</h3>
          <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">{dict.catResourceFormHint}</p>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span>{dict.fieldResourceName}</span>
              <input
                type="checkbox"
                checked={form.showResourceName}
                onChange={(e) => setForm({ ...form, showResourceName: e.target.checked })}
                className="h-4 w-4 shrink-0 rounded text-emerald-600"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span>{dict.fieldResourceDescription}</span>
              <input
                type="checkbox"
                checked={form.showResourceDescription}
                onChange={(e) => setForm({ ...form, showResourceDescription: e.target.checked })}
                className="h-4 w-4 shrink-0 rounded text-emerald-600"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span>{dict.fieldResourceRegistration}</span>
              <input
                type="checkbox"
                checked={form.showRegistrationNumber}
                onChange={(e) => setForm({ ...form, showRegistrationNumber: e.target.checked })}
                className="h-4 w-4 shrink-0 rounded text-emerald-600"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dict.catParamsTitle}</h3>

          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2">
            <div />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{dict.fieldsVisible}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{dict.fieldsRequired}</div>

            <div className="text-sm text-zinc-700 dark:text-zinc-300">{dict.fieldCustomer}</div>
            <input
              type="checkbox"
              checked={form.showCustomer}
              onChange={(e) => {
                const v = e.target.checked;
                setForm({ ...form, showCustomer: v, reqCustomer: v ? form.reqCustomer : false });
              }}
              className="h-4 w-4 rounded text-emerald-600"
            />
            <input
              type="checkbox"
              checked={form.reqCustomer}
              disabled={!form.showCustomer}
              onChange={(e) => setForm({ ...form, reqCustomer: e.target.checked })}
              className="h-4 w-4 rounded text-amber-500 disabled:opacity-40"
            />

            <div className="text-sm text-zinc-700 dark:text-zinc-300">{dict.fieldMaterial}</div>
            <input
              type="checkbox"
              checked={form.showMaterial}
              onChange={(e) => {
                const v = e.target.checked;
                setForm({ ...form, showMaterial: v, reqMaterial: v ? form.reqMaterial : false });
              }}
              className="h-4 w-4 rounded text-emerald-600"
            />
            <input
              type="checkbox"
              checked={form.reqMaterial}
              disabled={!form.showMaterial}
              onChange={(e) => setForm({ ...form, reqMaterial: e.target.checked })}
              className="h-4 w-4 rounded text-amber-500 disabled:opacity-40"
            />

            <div className="text-sm text-zinc-700 dark:text-zinc-300">{dict.fieldQuantity}</div>
            <input
              type="checkbox"
              checked={form.showQuantity}
              onChange={(e) => {
                const v = e.target.checked;
                setForm({ ...form, showQuantity: v, reqQuantity: v ? form.reqQuantity : false });
              }}
              className="h-4 w-4 rounded text-emerald-600"
            />
            <input
              type="checkbox"
              checked={form.reqQuantity}
              disabled={!form.showQuantity}
              onChange={(e) => setForm({ ...form, reqQuantity: e.target.checked })}
              className="h-4 w-4 rounded text-amber-500 disabled:opacity-40"
            />

            <div className="text-sm text-zinc-700 dark:text-zinc-300">{dict.fieldTaskDescription}</div>
            <input
              type="checkbox"
              checked={form.showTaskDescription}
              onChange={(e) => {
                const v = e.target.checked;
                setForm({
                  ...form,
                  showTaskDescription: v,
                  reqTaskDescription: v ? form.reqTaskDescription : false,
                });
              }}
              className="h-4 w-4 rounded text-emerald-600"
            />
            <input
              type="checkbox"
              checked={form.reqTaskDescription}
              disabled={!form.showTaskDescription}
              onChange={(e) => setForm({ ...form, reqTaskDescription: e.target.checked })}
              className="h-4 w-4 rounded text-amber-500 disabled:opacity-40"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{dict.isGlobalLabel}</label>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{dict.isGlobalDesc}</span>
            </div>
            <input
              type="checkbox"
              checked={form.isGlobal}
              onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
              className="h-4 w-4 rounded text-amber-500"
            />
          </div>
        </div>

      </form>
    </AdminModalShell>
  );
}
