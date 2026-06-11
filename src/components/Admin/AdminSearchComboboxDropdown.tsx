"use client";

import type { RefObject } from "react";
import type { FloatingPanelStyle } from "@/lib/floatingPanelPosition";
import { FLOATING_LISTBOX_PANEL_CLASS, touchScrollStyle } from "@/components/scrollPanelStyles";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";

export interface AdminSearchComboboxDropdownProps {
  id: string;
  listRef: RefObject<HTMLUListElement | null>;
  dropdownStyle: FloatingPanelStyle;
  filtered: AdminSearchComboboxOption[];
  value: string;
  highlightIndex: number;
  noResultsLabel: string;
  query: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  onPickOption: (optionId: string) => void;
  onEmptyAction: () => void;
}

export function AdminSearchComboboxDropdown({
  id,
  listRef,
  dropdownStyle,
  filtered,
  value,
  highlightIndex,
  noResultsLabel,
  query,
  emptyAction,
  onPickOption,
  onEmptyAction,
}: AdminSearchComboboxDropdownProps) {
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
        <li className="px-3 py-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{noResultsLabel}</p>
          {emptyAction && query.trim() ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onEmptyAction}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/80 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
            >
              {emptyAction.label}
            </button>
          ) : null}
        </li>
      ) : (
        filtered.map((option, index) => (
          <li key={option.id} role="option" aria-selected={value === option.id}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPickOption(option.id)}
              className={`w-full px-3 py-2 text-left text-sm transition ${
                index === highlightIndex
                  ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
                  : "text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <div className="font-medium">{option.label}</div>
              {option.sublabel ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{option.sublabel}</div>
              ) : null}
            </button>
          </li>
        ))
      )}
    </ul>
  );
}
