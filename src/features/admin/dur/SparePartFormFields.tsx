"use client";

import type { SparePartFormState } from "./sparePartFormTypes";
import { CategoryIdChipPicker } from "./CategoryIdChipPicker";
import type { SparePartCategory } from "@/types/dur";
import type { ResourceGroupOption } from "@/features/admin/dur/useResourceGroups";

interface SparePartFormFieldsProps {
  formState: SparePartFormState;
  onFormStateChange: (state: SparePartFormState) => void;
  partCategories: SparePartCategory[];
  machineGroups: ResourceGroupOption[];
  dict: {
    fields: {
      name: string;
      namePlaceholder: string;
      catalogNumber: string;
      catalogNumberPlaceholder: string;
      manufacturer: string;
      manufacturerPlaceholder: string;
      unit: string;
      unitPlaceholder: string;
      purchasePrice: string;
      purchasePricePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      minStock: string;
      minStockHint: string;
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
  partCategories,
  machineGroups,
  dict,
}: SparePartFormFieldsProps) {
  const updateField = <K extends keyof SparePartFormState>(
    key: K,
    value: SparePartFormState[K]
  ) => {
    onFormStateChange({ ...formState, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.fields.name} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formState.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder={dict.fields.namePlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Catalog number + Manufacturer */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {dict.fields.catalogNumber}
          </label>
          <input
            type="text"
            value={formState.catalogNumber}
            onChange={(e) => updateField("catalogNumber", e.target.value)}
            placeholder={dict.fields.catalogNumberPlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {dict.fields.manufacturer}
          </label>
          <input
            type="text"
            value={formState.manufacturer}
            onChange={(e) => updateField("manufacturer", e.target.value)}
            placeholder={dict.fields.manufacturerPlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Unit + Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {dict.fields.unit}
          </label>
          <input
            type="text"
            value={formState.unit}
            onChange={(e) => updateField("unit", e.target.value)}
            placeholder={dict.fields.unitPlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {dict.fields.purchasePrice}
          </label>
          <input
            type="text"
            value={formState.purchasePrice}
            onChange={(e) => updateField("purchasePrice", e.target.value)}
            placeholder={dict.fields.purchasePricePlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Min stock + Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {dict.fields.minStock}
          </label>
          <input
            type="text"
            value={formState.minStock}
            onChange={(e) => updateField("minStock", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <p className="mt-1 text-[10px] text-zinc-500">{dict.fields.minStockHint}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {dict.fields.location}
          </label>
          <input
            type="text"
            value={formState.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder={dict.fields.locationPlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.fields.description}
        </label>
        <textarea
          value={formState.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder={dict.fields.descriptionPlaceholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
        />
      </div>

      {/* Part Categories */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.fields.categories}
        </label>
        <CategoryIdChipPicker
          options={partCategories.filter((c) => !c.isGroup)}
          selectedIds={formState.categoryIds}
          onChange={(ids) => updateField("categoryIds", ids)}
          emptyHint={dict.fields.categoriesPlaceholder}
          colorVariant="emerald"
        />
      </div>

      {/* Machine Groups */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.fields.machineCategories}
        </label>
        <p className="text-[10px] text-zinc-500 mb-2">{dict.fields.machineCategoriesHint}</p>
        <CategoryIdChipPicker
          options={machineGroups}
          selectedIds={formState.resourceGroupIds}
          onChange={(ids) => updateField("resourceGroupIds", ids)}
          emptyHint={dict.fields.machineCategoriesPlaceholder}
          colorVariant="blue"
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={formState.isActive}
          onChange={(e) => updateField("isActive", e.target.checked)}
          className="rounded border-zinc-300 dark:border-zinc-600 text-emerald-500 focus:ring-emerald-500/50"
        />
        <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
          {dict.fields.isActive}
        </label>
        <span className="text-[10px] text-zinc-500">{dict.fields.isActiveHint}</span>
      </div>
    </div>
  );
}
