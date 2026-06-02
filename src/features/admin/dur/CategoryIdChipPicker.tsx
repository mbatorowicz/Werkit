"use client";

type CategoryOption = {
  id: number;
  name: string;
};

type ColorVariant = "emerald" | "blue";

interface CategoryIdChipPickerProps {
  options: CategoryOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  emptyHint: string;
  colorVariant?: ColorVariant;
  maxHeight?: string;
}

const colorClasses: Record<ColorVariant, { selected: string; unselected: string }> = {
  emerald: {
    selected:
      "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    unselected:
      "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300",
  },
  blue: {
    selected:
      "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-300",
    unselected:
      "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300",
  },
};

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

  const colors = colorClasses[colorVariant];

  return (
    <div className={`flex flex-wrap gap-2 overflow-y-auto ${maxHeight}`}>
      {options.length === 0 && (
        <p className="text-xs text-zinc-500 italic">{emptyHint}</p>
      )}
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => toggleId(opt.id)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            selectedIds.includes(opt.id) ? colors.selected : colors.unselected
          }`}
        >
          {opt.name}
        </button>
      ))}
    </div>
  );
}
