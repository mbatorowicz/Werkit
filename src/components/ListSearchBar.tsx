"use client";

import { Search } from "lucide-react";
import { LIST_SEARCH_INPUT_CLASS } from "@/components/searchFieldStyles";

type ListSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  className?: string;
};

export function ListSearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = "mb-4",
}: ListSearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={LIST_SEARCH_INPUT_CLASS}
      />
    </div>
  );
}
