"use client";

import { AdminFormField } from "@/components/Admin/AdminFormField";
import {
  INVENTORY_FORM_CONTROL,
  INVENTORY_FORM_GRID_2,
  INVENTORY_FORM_STACK,
  INVENTORY_FORM_TEXTAREA,
} from "@/components/Admin/adminInventoryFormStyles";
import { MeasureUnitSelect } from "@/components/Admin/MeasureUnitSelect";
import type { SparePartFormState } from "./sparePartFormTypes";
import { CategoryIdChipPicker } from "./CategoryIdChipPicker";
import { DecimalInput } from "@/components/DecimalInput";
import type { SparePartCategory } from "@/types/dur";
import type { ResourceGroupOption } from "@/features/admin/dur/useResourceGroups";
import type { AppDictionary } from "@/i18n/types";

type SharedDict = AppDictionary["admin"]["shared"];

interface SparePartFormFieldsProps {
  formState: SparePartFormState;
  onFormStateChange: (state: SparePartFormState) => void;
  isEditing: boolean;
  partCategories: SparePartCategory[];
  machineGroups: ResourceGroupOption[];
  sharedDict: SharedDict;
  dict: {
    fields: {
      name: string;
      namePlaceholder: string;
      catalogNumber: string;
      catalogNumberPlaceholder: string;
      manufacturer: string;
      manufacturerPlaceholder: string;
      purchasePrice: string;
      purchasePricePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      minStock: string;
      location: string;
      locationPlaceholder: string;
      isActive: string;
      isActiveHint: string;
      categories: string;
      categoriesPlaceholder: string;
      machineCategories: string;
      machineCategoriesHint: string;
      machineCategoriesPlaceholder: string;
    };
  };
}

export function SparePartFormFields({
  formState,
  onFormStateChange,
  isEditing,
  partCategories,
  machineGroups,
  sharedDict,
  dict,
}: SparePartFormFieldsProps) {
  const updateField = <K extends keyof SparePartFormState>(
    key: K,
    value: SparePartFormState[K]
  ) => {
    onFormStateChange({ ...formState, [key]: value });
  };

  return (
    <div className={INVENTORY_FORM_STACK}>
      <AdminFormField label={dict.fields.name} required htmlFor="spare-part-name">
        <input
          id="spare-part-name"
          type="text"
          value={formState.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder={dict.fields.namePlaceholder}
          className={INVENTORY_FORM_CONTROL}
          required
        />
      </AdminFormField>

      <div className={INVENTORY_FORM_GRID_2}>
        <AdminFormField label={dict.fields.catalogNumber} htmlFor="spare-part-catalog">
          <input
            id="spare-part-catalog"
            type="text"
            value={formState.catalogNumber}
            onChange={(e) => updateField("catalogNumber", e.target.value)}
            placeholder={dict.fields.catalogNumberPlaceholder}
            className={INVENTORY_FORM_CONTROL}
          />
        </AdminFormField>
        <AdminFormField label={dict.fields.manufacturer} htmlFor="spare-part-manufacturer">
          <input
            id="spare-part-manufacturer"
            type="text"
            value={formState.manufacturer}
            onChange={(e) => updateField("manufacturer", e.target.value)}
            placeholder={dict.fields.manufacturerPlaceholder}
            className={INVENTORY_FORM_CONTROL}
          />
        </AdminFormField>
      </div>

      <div className={isEditing ? INVENTORY_FORM_GRID_2 : undefined}>
        <AdminFormField label={sharedDict.measureUnitLabel} required htmlFor="spare-part-unit">
          <MeasureUnitSelect
            id="spare-part-unit"
            value={formState.unit}
            onChange={(unit) => updateField("unit", unit)}
            unitLabels={sharedDict.measureUnitOptions}
            required
          />
        </AdminFormField>
        {isEditing ? (
          <AdminFormField label={dict.fields.purchasePrice} htmlFor="spare-part-price">
            <DecimalInput
              id="spare-part-price"
              value={formState.purchasePrice}
              onChange={(v) => updateField("purchasePrice", v)}
              placeholder={dict.fields.purchasePricePlaceholder}
              className={INVENTORY_FORM_CONTROL}
            />
          </AdminFormField>
        ) : null}
      </div>

      <div className={INVENTORY_FORM_GRID_2}>
        <AdminFormField
          label={dict.fields.minStock}
          hint={sharedDict.minStockHint}
          htmlFor="spare-part-min-stock"
        >
          <DecimalInput
            id="spare-part-min-stock"
            value={formState.minStock}
            onChange={(v) => updateField("minStock", v)}
            className={INVENTORY_FORM_CONTROL}
          />
        </AdminFormField>
        <AdminFormField label={dict.fields.location} htmlFor="spare-part-location">
          <input
            id="spare-part-location"
            type="text"
            value={formState.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder={dict.fields.locationPlaceholder}
            className={INVENTORY_FORM_CONTROL}
          />
        </AdminFormField>
      </div>

      <AdminFormField label={dict.fields.description} htmlFor="spare-part-description">
        <textarea
          id="spare-part-description"
          value={formState.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder={dict.fields.descriptionPlaceholder}
          rows={3}
          className={INVENTORY_FORM_TEXTAREA}
        />
      </AdminFormField>

      <AdminFormField label={dict.fields.categories}>
        <CategoryIdChipPicker
          options={partCategories.filter((c) => !c.isGroup)}
          selectedIds={formState.categoryIds}
          onChange={(ids) => updateField("categoryIds", ids)}
          emptyHint={dict.fields.categoriesPlaceholder}
        />
      </AdminFormField>

      <AdminFormField
        label={dict.fields.machineCategories}
        hint={dict.fields.machineCategoriesHint}
      >
        <CategoryIdChipPicker
          options={machineGroups}
          selectedIds={formState.resourceGroupIds}
          onChange={(ids) => updateField("resourceGroupIds", ids)}
          emptyHint={dict.fields.machineCategoriesPlaceholder}
          colorVariant="blue"
        />
      </AdminFormField>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={formState.isActive}
          onChange={(e) => updateField("isActive", e.target.checked)}
          className="rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500/50 dark:border-zinc-600"
        />
        <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
          {dict.fields.isActive}
        </label>
        <span className="text-[11px] text-zinc-500">{dict.fields.isActiveHint}</span>
      </div>
    </div>
  );
}
