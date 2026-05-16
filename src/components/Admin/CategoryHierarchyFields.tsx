"use client";

import { getDictionary } from "@/i18n";
import { filterCategoryGroups } from "@/lib/categoryTree";

type Row = { id: number; name: string; parentId: number | null; isGroup: boolean; sortOrder: number };

type Props = {
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
  categories: Row[];
  excludeId?: number | null;
  onParentIdChange: (parentId: number | null) => void;
  onIsGroupChange: (isGroup: boolean) => void;
  onSortOrderChange: (sortOrder: number) => void;
};

export function CategoryHierarchyFields({
  parentId,
  isGroup,
  sortOrder,
  categories,
  excludeId,
  onParentIdChange,
  onIsGroupChange,
  onSortOrderChange,
}: Props) {
  const g = getDictionary().admin.groups;
  const parentOptions = filterCategoryGroups(categories).filter((c) => c.id !== excludeId);

  return (
    <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isGroup}
          onChange={(e) => onIsGroupChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded text-emerald-600"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{g.isGroupLabel}</span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{g.isGroupHint}</span>
        </span>
      </label>

      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-500">{g.parentLabel}</label>
        <select
          value={parentId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onParentIdChange(v === "" ? null : Number.parseInt(v, 10));
          }}
          className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{g.parentNone}</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-500">{g.sortOrderLabel}</label>
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => onSortOrderChange(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
          className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
    </div>
  );
}

