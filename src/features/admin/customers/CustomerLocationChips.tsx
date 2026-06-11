"use client";

import type { CustomerLocationRow } from "@/services/CustomerLocationService";

interface CustomerLocationChipsProps {
  locations: CustomerLocationRow[];
  selectedId: number | null;
  isDraftOpen: boolean;
  defaultBadgeLabel: string;
  emptyLabel: string;
  onSelect: (loc: CustomerLocationRow) => void;
}

export function CustomerLocationChips({
  locations,
  selectedId,
  isDraftOpen,
  defaultBadgeLabel,
  emptyLabel,
  onSelect,
}: CustomerLocationChipsProps) {
  if (locations.length === 0) {
    return <p className="text-xs text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {locations.map((loc) => (
        <button
          key={loc.id}
          type="button"
          onClick={() => onSelect(loc)}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            selectedId === loc.id && !isDraftOpen
              ? "bg-emerald-600 text-white border-emerald-600"
              : "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500"
          }`}
        >
          {loc.label}
          {loc.isDefault ? ` (${defaultBadgeLabel})` : ""}
        </button>
      ))}
    </div>
  );
}
