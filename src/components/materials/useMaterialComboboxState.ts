"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { filterComboboxOptions } from "@/lib/searchComboboxFilter";
import {
  filterMaterialsByMaterialCategory,
  parseMaterialCategoryOptionId,
  toMaterialCategoryOptionId,
  type MaterialCategoryRow,
  type MaterialPickerRow,
} from "@/lib/materialCategoryPicker";
import { useDismissOnOutsidePointer } from "@/hooks/useDismissOnOutsidePointer";
import { useFloatingPanelPosition } from "@/hooks/useFloatingPanelPosition";

export type MaterialComboboxListOption = {
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

interface UseMaterialComboboxStateArgs {
  categories: MaterialCategoryRow[];
  materials: MaterialPickerRow[];
  materialCategoryId: string;
  materialId: string;
  onMaterialCategoryChange: (categoryId: string) => void;
  onMaterialChange: (materialId: string) => void;
  dict: MaterialCategoryMaterialComboboxDict;
  placeholder?: string;
}

function resolveEmptyLabel(
  categoryStepActive: boolean,
  materialCategoryId: string,
  dict: MaterialCategoryMaterialComboboxDict
): string {
  if (categoryStepActive) return dict.noCategories;
  return materialCategoryId ? dict.noMaterialsInCategory : dict.noCategories;
}

function resolvePlaceholder(
  placeholder: string | undefined,
  categoryStepActive: boolean,
  materialCategoryId: string,
  dict: MaterialCategoryMaterialComboboxDict
): string {
  if (placeholder != null) return placeholder;
  if (categoryStepActive) return dict.chooseCategory;
  return materialCategoryId ? dict.searchMaterial : dict.chooseCategory;
}

export function useMaterialComboboxState({
  categories,
  materials,
  materialCategoryId,
  materialId,
  onMaterialCategoryChange,
  onMaterialChange,
  dict,
  placeholder,
}: UseMaterialComboboxStateArgs) {
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

  const listOptions: MaterialComboboxListOption[] = useMemo(() => {
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

  const emptyLabel = resolveEmptyLabel(categoryStepActive, materialCategoryId, dict);
  const resolvedPlaceholder = resolvePlaceholder(
    placeholder,
    categoryStepActive,
    materialCategoryId,
    dict
  );

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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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

  return {
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
  };
}
