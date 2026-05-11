"use client";

import { AdminCategoryColorFieldRow } from "@/components/Admin/AdminCategoryColorFieldRow";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import type { AppDictionary } from "@/i18n/types";
import type { MaterialCategoryFormState } from "@/features/admin/materials/types";

type Dict = AppDictionary["admin"]["materials"];
type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  dict: Dict;
  machDict: MachDict;
  form: MaterialCategoryFormState;
  setForm: React.Dispatch<React.SetStateAction<MaterialCategoryFormState>>;
  onSubmit: (e: React.FormEvent) => void;
};

export function MaterialsCategoryFormModal({ open, onClose, isEdit, dict, machDict, form, setForm, onSubmit }: Props) {
  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? dict.modalCatEditTitle : dict.modalCatCreateTitle}
      maxWidthClass="max-w-sm"
      titleSize="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4 p-6">
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
          label={machDict.catColorLabel}
          hint={machDict.catColorHint}
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-zinc-900 py-2.5 font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {dict.saveDict}
        </button>
      </form>
    </AdminModalShell>
  );
}
