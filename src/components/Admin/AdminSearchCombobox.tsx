"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { filterComboboxOptions } from "@/lib/searchComboboxFilter";
import { SEARCH_COMBOBOX_INPUT_CLASS } from "@/components/searchFieldStyles";
import {
  FLOATING_LISTBOX_PANEL_CLASS,
  touchScrollStyle,
} from "@/components/scrollPanelStyles";
import { useDismissOnOutsidePointer } from "@/hooks/useDismissOnOutsidePointer";
import { useFloatingPanelPosition } from "@/hooks/useFloatingPanelPosition";

export type AdminSearchComboboxOption = {
  id: string;
  label: string;
  sublabel?: string;
  /** Tekst używany wyłącznie do filtrowania (np. pełny adres klienta). */
  searchText?: string;
};

const INPUT_CLASS = SEARCH_COMBOBOX_INPUT_CLASS;

type Props = {
  options: AdminSearchComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  noResultsLabel?: string;
  clearAriaLabel?: string;
  inputId?: string;
  "aria-label"?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
};

export function AdminSearchCombobox({
  options,
  value,
  onChange,
  onQueryChange,
  placeholder,
  disabled = false,
  required = false,
  noResultsLabel = "Brak wyników",
  clearAriaLabel = "Wyczyść",
  inputId,
  "aria-label": ariaLabel,
  emptyAction,
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

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(
    () =>
      filterComboboxOptions(
        options,
        query,
        (o) => o.searchText ?? `${o.label} ${o.sublabel ?? ""}`,
      ).map((o) => ({
        id: o.id,
        label: o.label,
        sublabel: o.sublabel,
        searchText: o.searchText,
      })),
    [options, query],
  );

  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset highlight on query/open change
    setHighlightIndex(0);
  }, [query, open]);

  const displayValue = open ? query : (selected?.label ?? query);

  const pickOption = (optionId: string) => {
    onChange(optionId);
    setOpen(false);
    setQuery("");
  };

  const clearSelection = () => {
    onChange("");
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

  const closeEmptyAction = useCallback(() => {
    setOpen(false);
    emptyAction?.onClick();
  }, [emptyAction]);

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
          <li className="px-3 py-2">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{noResultsLabel}</p>
            {emptyAction && query.trim() ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={closeEmptyAction}
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
                onClick={() => pickOption(option.id)}
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
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      {required ? <input type="hidden" value={value} required tabIndex={-1} aria-hidden /> : null}
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (!open) setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            if (selected && !query) setQuery(selected.label);
          }}
          onKeyDown={onKeyDown}
          className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          autoComplete="off"
        />
        {value && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={clearSelection}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={clearAriaLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>

      {dropdownList && typeof document !== "undefined" ? createPortal(dropdownList, document.body) : null}
    </div>
  );
}
