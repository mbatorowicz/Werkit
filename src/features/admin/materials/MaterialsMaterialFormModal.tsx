"use client";

import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import type { AppDictionary } from "@/i18n/types";
import type { MaterialCategory, MaterialItemFormState } from "@/features/admin/materials/types";

type Dict = AppDictionary["admin"]["materials"];
type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  dict: Dict;
  machDict: MachDict;
  categories: MaterialCategory[];
  form: MaterialItemFormState;
  setForm: React.Dispatch<React.SetStateAction<MaterialItemFormState>>;
  onSubmit: (e: React.FormEvent) => void;
};

export function MaterialsMaterialFormModal({
  open,
  onClose,
  isEdit,
  dict,
  machDict,
  categories,
  form,
  setForm,
  onSubmit,
}: Props) {
  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? dict.modalEditTitle : dict.modalCreateTitle}
      maxWidthClass="max-w-lg"
      titleSize="lg"
    >
      <form onSubmit={onSubmit} className="space-y-6 p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.nameLabel}</label>
          <input
            required
            type="text"
            placeholder={dict.namePlaceholder}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-amber-500/80">{dict.matCatLabel}</label>
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
                    if (e.target.checked) setForm({ ...form, categoryIds: [...form.categoryIds, c.id] });
                    else setForm({ ...form, categoryIds: form.categoryIds.filter((id) => id !== c.id) });
                  }}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{c.name}</span>
              </label>
            ))}
          </div>
          {categories.length === 0 ? <p className="text-xs text-red-400">{machDict.machCatWarning}</p> : null}
        </div>
        <div className="border-t border-zinc-800 pt-4">
          <button
            type="submit"
            className="w-full rounded-lg bg-amber-600 py-3 font-bold text-white shadow-sm transition hover:bg-amber-500 active:scale-[0.98]"
          >
            {dict.saveFleet}
          </button>
        </div>
      </form>
    </AdminModalShell>
  );
}
