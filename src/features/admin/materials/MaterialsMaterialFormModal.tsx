"use client";

import { AdminFormField } from "@/components/Admin/AdminFormField";
import {
  INVENTORY_FORM_CONTROL,
  INVENTORY_FORM_GRID_2,
  INVENTORY_FORM_STACK,
} from "@/components/Admin/adminInventoryFormStyles";
import { MeasureUnitSelect } from "@/components/Admin/MeasureUnitSelect";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { CategoryColorDot } from "@/components/CategoryColorBadge";
import { DecimalInput } from "@/components/DecimalInput";
import { FormModalFooter } from "@/components/FormModalFooter";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";
import type { AppDictionary } from "@/i18n/types";
import { filterCategoryLeaves } from "@/lib/categoryTree";
import type { MaterialCategory, MaterialItemFormState } from "@/features/admin/materials/types";

type Dict = AppDictionary["admin"]["materials"];
type SharedDict = AppDictionary["admin"]["shared"];
type MachDict = AppDictionary["admin"]["machines"];

type Props = {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  dict: Dict;
  sharedDict: SharedDict;
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
  sharedDict,
  machDict,
  categories,
  form,
  setForm,
  onSubmit,
}: Props) {
  const leafCategories = filterCategoryLeaves(categories);

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? dict.modalEditTitle : dict.modalCreateTitle}
      maxWidthClass="max-w-lg"
      titleSize="lg"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="admin-material-form"
          onCancel={onClose}
          submitLabel={dict.saveFleet}
        />
      }
    >
      <form id="admin-material-form" onSubmit={onSubmit} className={`${INVENTORY_FORM_STACK} p-6`}>
        <AdminFormField label={dict.nameLabel} required htmlFor="material-name">
          <input
            id="material-name"
            required
            type="text"
            placeholder={dict.namePlaceholder}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={INVENTORY_FORM_CONTROL}
          />
        </AdminFormField>

        <AdminFormField label={dict.matCatLabel} required>
          <div className={`grid max-h-48 grid-cols-2 gap-2 pr-1 ${INLINE_SCROLL_PANEL_CLASS}`}>
            {leafCategories.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(c.id)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setForm({ ...form, categoryIds: [...form.categoryIds, c.id] });
                    else
                      setForm({
                        ...form,
                        categoryIds: form.categoryIds.filter((id) => id !== c.id),
                      });
                  }}
                  className="h-4 w-4 rounded text-emerald-500"
                />
                <span className="inline-flex min-w-0 items-center gap-2 truncate text-sm text-zinc-700 dark:text-zinc-300">
                  <CategoryColorDot color={c.color} />
                  {c.name}
                </span>
              </label>
            ))}
          </div>
          {leafCategories.length === 0 ? (
            <p className="text-xs text-red-400">{machDict.machCatWarning}</p>
          ) : null}
        </AdminFormField>

        <AdminFormField label={sharedDict.measureUnitLabel} required htmlFor="material-unit">
          <MeasureUnitSelect
            id="material-unit"
            value={form.unit}
            onChange={(unit) => setForm({ ...form, unit })}
            unitLabels={sharedDict.measureUnitOptions}
            required
          />
        </AdminFormField>

        <div className={INVENTORY_FORM_GRID_2}>
          <AdminFormField
            label={dict.minStockLabel}
            hint={sharedDict.minStockHint}
            htmlFor="material-min-stock"
          >
            <DecimalInput
              id="material-min-stock"
              value={form.minStock}
              onChange={(minStock) => setForm({ ...form, minStock })}
              className={INVENTORY_FORM_CONTROL}
              placeholder={dict.minStockPlaceholder}
            />
          </AdminFormField>
          <AdminFormField label={dict.locationLabel} htmlFor="material-location">
            <input
              id="material-location"
              type="text"
              placeholder={dict.locationPlaceholder}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={INVENTORY_FORM_CONTROL}
            />
          </AdminFormField>
        </div>
      </form>
    </AdminModalShell>
  );
}
