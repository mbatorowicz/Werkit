"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { CategoryColorTag } from "@/components/CategoryColorBadge";
import type { MaterialCategoryRow, MaterialPickerRow } from "@/lib/materialCategoryPicker";
import { MaterialComboboxDropdownList } from "./MaterialComboboxDropdownList";
import { useMaterialComboboxState } from "./useMaterialComboboxState";
import type { MaterialCategoryMaterialComboboxDict } from "./useMaterialComboboxState";

export type { MaterialCategoryMaterialComboboxDict };

type Props = {
  categories: MaterialCategoryRow[];
  materials: MaterialPickerRow[];
  materialCategoryId: string;
  materialId: string;
  onMaterialCategoryChange: (categoryId: string) => void;
  onMaterialChange: (materialId: string) => void;
  dict: MaterialCategoryMaterialComboboxDict;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  inputId?: string;
  "aria-label"?: string;
};

export function MaterialCategoryMaterialCombobox({
  categories,
  materials,
  materialCategoryId,
  materialId,
  onMaterialCategoryChange,
  onMaterialChange,
  dict,
  placeholder,
  disabled = false,
  required = false,
  inputId,
  "aria-label": ariaLabel,
}: Props) {
  const autoId = useId();
  const id = inputId ?? autoId;

  const {
    rootRef,
    listRef,
    open,
    setOpen,
    query,
    setQuery,
    highlightIndex,
    dropdownStyle,
    selectedCategory,
    selectedMaterial,
    filtered,
    emptyLabel,
    resolvedPlaceholder,
    displayValue,
    pickOption,
    clearMaterial,
    clearCategoryTag,
    onKeyDown,
  } = useMaterialComboboxState({
    categories,
    materials,
    materialCategoryId,
    materialId,
    onMaterialCategoryChange,
    onMaterialChange,
    dict,
    placeholder,
  });

  const dropdownList =
    open && !disabled && dropdownStyle ? (
      <MaterialComboboxDropdownList
        id={id}
        listRef={listRef}
        dropdownStyle={dropdownStyle}
        filtered={filtered}
        emptyLabel={emptyLabel}
        highlightIndex={highlightIndex}
        materialId={materialId}
        materialCategoryId={materialCategoryId}
        onPick={pickOption}
      />
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      {required ? (
        <input type="hidden" value={materialId} required tabIndex={-1} aria-hidden />
      ) : null}
      <div
        className={`relative flex min-h-[2.75rem] flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-[#f2fbfa] px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900 ${
          open ? "ring-1 ring-emerald-500 border-emerald-500" : ""
        }`}
      >
        {selectedCategory ? (
          <CategoryColorTag
            label={selectedCategory.name}
            color={selectedCategory.color}
            onClear={clearCategoryTag}
            clearAriaLabel={dict.clearCategory}
            disabled={disabled}
          />
        ) : null}
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          disabled={disabled}
          placeholder={selectedCategory ? dict.searchMaterial : resolvedPlaceholder}
          value={displayValue}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (!open) setOpen(true);
            if (materialId) onMaterialChange("");
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            if (selectedMaterial && !query) setQuery(selectedMaterial.name);
          }}
          onKeyDown={onKeyDown}
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white"
          autoComplete="off"
        />
        {materialId && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={clearMaterial}
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={dict.clear}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 text-zinc-400" />
      </div>

      {dropdownList && typeof document !== "undefined"
        ? createPortal(dropdownList, document.body)
        : null}
    </div>
  );
}
