"use client";

import type { CustomerLocationRow } from "@/services/CustomerLocationService";
import { CHIP_IDLE, CHIP_SELECTED } from "@/lib/uiChrome";
import { cn } from "@/lib/cn";

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
          className={cn(selectedId === loc.id && !isDraftOpen ? CHIP_SELECTED : CHIP_IDLE)}
        >
          {loc.label}
          {loc.isDefault ? ` (${defaultBadgeLabel})` : ""}
        </button>
      ))}
    </div>
  );
}
