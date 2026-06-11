"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { CategoryColorDot, CategoryColorTag } from "@/components/CategoryColorBadge";
import { filterComboboxOptions } from "@/lib/searchComboboxFilter";
import {
  filterMaterialsByMaterialCategory,
  parseMaterialCategoryOptionId,
  toMaterialCategoryOptionId,
  type MaterialCategoryRow,
  type MaterialPickerRow,
} from "@/lib/materialCategoryPicker";
import { FLOATING_LISTBOX_PANEL_CLASS, touchScrollStyle } from "@/components/scrollPanelStyles";
import { useDismissOnOutsidePointer } from "@/hooks/useDismissOnOutsidePointer";
import { useFloatingPanelPosition } from "@/hooks/useFloatingPanelPosition";

type ListOption = {
  id: string;
  label: string;
  color?: string | null;
  kind: "category" | "material";
};

export type MaterialCategoryMaterialComboboxDict = {
  chooseCategory: string;
  searchMaterial: string;
  noCategories: string;
  noMaterialsInCategory: string;
  clearCategory: string;
  clear: string;
  noResults: string;
};

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
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const dropdownStyle = useFloatingPanelPosition(rootRef, open);
  const dismissDropdown = useCallback(() => setOpen(false), []);

  useDismissOnOutsidePointer([rootRef, listRef], open, dismissDropdown);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === materialCategoryId) ?? null,
    [categories, materialCategoryId]
  );

  const selectedMaterial = useMemo(
    () => materials.find((m) => String(m.id) === materialId) ?? null,
    [materials, materialId]
  );

  const categoryStepActive = categories.length > 0 && !materialCategoryId;

  const listOptions: ListOption[] = useMemo(() => {
    if (categoryStepActive) {
      return categories.map((c) => ({
        id: toMaterialCategoryOptionId(c.id),
        label: c.name,
        color: c.color,
        kind: "category" as const,
      }));
    }
    let scoped = materialCategoryId
      ? filterMaterialsByMaterialCategory(materials, materialCategoryId)
      : materials;
    if (materialCategoryId && scoped.length === 0) {
      scoped = materials;
    }
    return scoped.map((m) => ({
      id: String(m.id),
      label: m.name,
      kind: "material" as const,
    }));
  }, [categories, categoryStepActive, materialCategoryId, materials]);

  const filtered = useMemo(
    () =>
      filterComboboxOptions(listOptions, query, (o) => o.label, 50).map((o) => ({
        id: o.id,
        label: o.label,
        color: o.color,
        kind: o.kind,
      })),
    [listOptions, query]
  );

  const emptyLabel = categoryStepActive
    ? dict.noCategories
    : materialCategoryId
      ? dict.noMaterialsInCategory
      : dict.noCategories;
  const resolvedPlaceholder =
    placeholder ??
    (categoryStepActive
      ? dict.chooseCategory
      : materialCategoryId
        ? dict.searchMaterial
        : dict.chooseCategory);

  // Reset podświetlenia przy zmianie zapytania/otwarcia/kategorii — w trakcie renderu.
  const highlightResetKey = `${query}|${open}|${materialCategoryId}`;
  const [prevHighlightResetKey, setPrevHighlightResetKey] = useState(highlightResetKey);
  if (prevHighlightResetKey !== highlightResetKey) {
    setPrevHighlightResetKey(highlightResetKey);
    setHighlightIndex(0);
  }

  const displayValue = open
    ? query
    : (selectedMaterial?.name ?? (selectedCategory && !materialId ? "" : ""));

  const pickOption = (optionId: string) => {
    const catId = parseMaterialCategoryOptionId(optionId);
    if (catId != null) {
      onMaterialCategoryChange(String(catId));
      onMaterialChange("");
      setQuery("");
      setOpen(true);
      return;
    }
    onMaterialChange(optionId);
    setOpen(false);
    setQuery("");
  };

  const clearMaterial = () => {
    onMaterialChange("");
    setQuery("");
    setOpen(true);
  };

  const clearCategoryTag = () => {
    onMaterialCategoryChange("");
    onMaterialChange("");
    setQuery("");
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlightIndex]) {
        e.preventDefault();
        pickOption(filtered[highlightIndex].id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const dropdownList =
    open && !disabled && dropdownStyle ? (
      <ul
        id={`${id}-listbox`}
        ref={listRef}
        role="listbox"
        className={FLOATING_LISTBOX_PANEL_CLASS}
        style={{
          top: dropdownStyle.top,
          bottom: dropdownStyle.bottom,
          left: dropdownStyle.left,
          width: dropdownStyle.width,
          ...touchScrollStyle(dropdownStyle.maxHeight),
        }}
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</li>
        ) : (
          filtered.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={
                option.kind === "material"
                  ? materialId === option.id
                  : materialCategoryId === String(parseMaterialCategoryOptionId(option.id) ?? "")
              }
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pickOption(option.id);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition ${
                  index === highlightIndex
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
                    : "text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {option.kind === "category" ? <CategoryColorDot color={option.color} /> : null}
                  <span className="truncate">{option.label}</span>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
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
