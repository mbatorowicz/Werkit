"use client";

import { useDictionary } from "@/i18n";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { filterComboboxOptions } from "@/lib/searchComboboxFilter";
import { SEARCH_COMBOBOX_INPUT_CLASS } from "@/components/searchFieldStyles";
import { useDismissOnOutsidePointer } from "@/hooks/useDismissOnOutsidePointer";
import { useFloatingPanelPosition } from "@/hooks/useFloatingPanelPosition";
import { AdminSearchComboboxDropdown } from "@/components/Admin/AdminSearchComboboxDropdown";

export type AdminSearchComboboxOption = {
  id: string;
  label: string;
  sublabel?: string;
  /** Tekst używany wyłącznie do filtrowania (np. pełny adres klienta). */
  searchText?: string;
};

const INPUT_CLASS = SEARCH_COMBOBOX_INPUT_CLASS;

function filterAdminComboboxOptions(
  options: AdminSearchComboboxOption[],
  query: string
): AdminSearchComboboxOption[] {
  return filterComboboxOptions(
    options,
    query,
    (o) => o.searchText ?? `${o.label} ${o.sublabel ?? ""}`
  ).map((o) => ({
    id: o.id,
    label: o.label,
    sublabel: o.sublabel,
    searchText: o.searchText,
  }));
}

function handleComboboxKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  ctx: {
    open: boolean;
    filtered: AdminSearchComboboxOption[];
    highlightIndex: number;
    setOpen: (open: boolean) => void;
    setHighlightIndex: React.Dispatch<React.SetStateAction<number>>;
    pickOption: (optionId: string) => void;
  }
) {
  const { open, filtered, highlightIndex, setOpen, setHighlightIndex, pickOption } = ctx;
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
}

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
  /** Wartość oznaczająca „brak wyboru” (np. `COMBO_NONE`) — nie traktowana jak aktywny wybór w polu. */
  noneId?: string;
};

export function AdminSearchCombobox({
  options,
  value,
  onChange,
  onQueryChange,
  placeholder,
  disabled = false,
  required = false,
  noResultsLabel,
  clearAriaLabel,
  inputId,
  "aria-label": ariaLabel,
  emptyAction,
  noneId,
}: Props) {
  const dict = useDictionary().admin.ui;
  const emptyValue = noneId ?? "";
  const isEmptySelection = useCallback(
    (v: string) => v === "" || (noneId != null && v === noneId),
    [noneId]
  );
  const resolvedNoResults = noResultsLabel ?? dict.noResults;
  const resolvedClear = clearAriaLabel ?? dict.clear;
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

  /** Pusty `value` / `noneId` = brak wyboru (nie mylić z opcją placeholder o `id: ""`). */
  const selected = useMemo(
    () => (isEmptySelection(value) ? null : (options.find((o) => o.id === value) ?? null)),
    [options, value, isEmptySelection]
  );

  const filtered = useMemo(() => filterAdminComboboxOptions(options, query), [options, query]);

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
    onChange(emptyValue);
    setQuery("");
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) =>
    handleComboboxKeyDown(e, {
      open,
      filtered,
      highlightIndex,
      setOpen,
      setHighlightIndex,
      pickOption,
    });

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
      <AdminSearchComboboxDropdown
        id={id}
        listRef={listRef}
        dropdownStyle={dropdownStyle}
        filtered={filtered}
        value={value}
        highlightIndex={highlightIndex}
        noResultsLabel={resolvedNoResults}
        query={query}
        emptyAction={emptyAction}
        onPickOption={pickOption}
        onEmptyAction={closeEmptyAction}
      />
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
            if (!isEmptySelection(value)) onChange(emptyValue);
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
        {!isEmptySelection(value) && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={clearSelection}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={resolvedClear}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>

      {dropdownList && typeof document !== "undefined"
        ? createPortal(dropdownList, document.body)
        : null}
    </div>
  );
}
