"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { filterComboboxOptions } from "@/lib/searchComboboxFilter";

export type AdminSearchComboboxOption = {
  id: string;
  label: string;
  sublabel?: string;
};

const INPUT_CLASS =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 pl-4 pr-10 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

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
}: Props) {
  const autoId = useId();
  const id = inputId ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(
    () =>
      filterComboboxOptions(options, query, (o) => `${o.label} ${o.sublabel ?? ""}`).map((o) => ({
        id: o.id,
        label: o.label,
        sublabel: o.sublabel,
      })),
    [options, query],
  );

  const updateDropdownPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        onQueryChange?.("");
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  const displayValue = open ? query : selected?.label ?? "";

  const pickOption = (optionId: string) => {
    onChange(optionId);
    setOpen(false);
    setQuery("");
    onQueryChange?.("");
  };

  const clearSelection = () => {
    onChange("");
    setQuery("");
    onQueryChange?.("");
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
      setQuery("");
      onQueryChange?.("");
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

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
            onQueryChange?.(next);
            if (!open) setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            if (selected && !query) setQuery("");
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

      {open && !disabled && dropdownStyle ? (
        <ul
          id={`${id}-listbox`}
          ref={listRef}
          role="listbox"
          className="fixed z-[200] max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
          }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">{noResultsLabel}</li>
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
      ) : null}
    </div>
  );
}
