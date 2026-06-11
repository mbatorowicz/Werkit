"use client";

import type { RefObject } from "react";
import { CategoryColorDot } from "@/components/CategoryColorBadge";
import { parseMaterialCategoryOptionId } from "@/lib/materialCategoryPicker";
import { FLOATING_LISTBOX_PANEL_CLASS, touchScrollStyle } from "@/components/scrollPanelStyles";
import type { FloatingPanelStyle } from "@/lib/floatingPanelPosition";
import type { MaterialComboboxListOption } from "./useMaterialComboboxState";

interface MaterialComboboxDropdownListProps {
  id: string;
  listRef: RefObject<HTMLUListElement | null>;
  dropdownStyle: FloatingPanelStyle;
  filtered: MaterialComboboxListOption[];
  emptyLabel: string;
  highlightIndex: number;
  materialId: string;
  materialCategoryId: string;
  onPick: (optionId: string) => void;
}

export function MaterialComboboxDropdownList({
  id,
  listRef,
  dropdownStyle,
  filtered,
  emptyLabel,
  highlightIndex,
  materialId,
  materialCategoryId,
  onPick,
}: MaterialComboboxDropdownListProps) {
  return (
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
                onPick(option.id);
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
  );
}
