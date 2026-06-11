"use client";

import {
  categoryColorChipClassName,
  categoryColorChipStyle,
  type CategoryColorChipVariant,
} from "@/lib/categoryColorStyles";

type CategoryOption = {
  id: number;
  name: string;
  color?: string | null;
};

interface CategoryIdChipPickerProps {
  options: CategoryOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  emptyHint: string;
  /** Gdy opcja nie ma `color` — styl zaznaczenia (np. grupy maszyn bez koloru w słowniku). */
  colorVariant?: CategoryColorChipVariant;
  maxHeight?: string;
}

export function CategoryIdChipPicker({
  options,
  selectedIds,
  onChange,
  emptyHint,
  colorVariant = "emerald",
  maxHeight = "max-h-32",
}: CategoryIdChipPickerProps) {
  const toggleId = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 overflow-y-auto ${maxHeight}`}>
      {options.length === 0 && <p className="text-xs text-zinc-500 italic">{emptyHint}</p>}
      {options.map((opt) => {
        const selected = selectedIds.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggleId(opt.id)}
            className={categoryColorChipClassName(selected, opt.color, colorVariant)}
            style={categoryColorChipStyle(selected, opt.color)}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}
