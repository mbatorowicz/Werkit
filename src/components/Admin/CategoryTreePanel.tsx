"use client";

import { ChevronRight, Edit2, Folder, Layers, Plus, Trash2 } from "lucide-react";
import { buildCategoryTree, flattenCategoryTree, type CategoryHierarchyRow } from "@/lib/categoryTree";

export type CategoryTreeItem = CategoryHierarchyRow & {
  color?: string | null;
  isStationary?: boolean;
};

type Props<T extends CategoryTreeItem> = {
  title: string;
  subtitle: string;
  addLabel: string;
  emptyLabel: string;
  groupBadge: string;
  leafBadge?: string;
  stationaryBadge?: string;
  items: T[];
  isLoading: boolean;
  canMutate: boolean;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: number) => void;
};

export function CategoryTreePanel<T extends CategoryTreeItem>({
  title,
  subtitle,
  addLabel,
  emptyLabel,
  groupBadge,
  leafBadge,
  stationaryBadge,
  items,
  isLoading,
  canMutate,
  onAdd,
  onEdit,
  onDelete,
}: Props<T>) {
  const flat = flattenCategoryTree(buildCategoryTree(items));

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 pt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Layers className="h-5 w-5 text-amber-500" /> {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        ) : null}
      </div>

      <div className="mb-10 space-y-1">
        {flat.map((node) => (
          <div
            key={node.id}
            className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            style={{ marginLeft: `${node.depth * 1.25}rem` }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {node.depth > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              ) : null}
              {node.isGroup ? (
                <Folder className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <div
                  className="h-4 w-4 shrink-0 rounded shadow-sm"
                  style={{ backgroundColor: node.color || "#3f3f46" }}
                />
              )}
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">{node.name}</span>
              {node.isGroup ? (
                <span className="shrink-0 rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {groupBadge}
                </span>
              ) : leafBadge ? (
                <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  {leafBadge}
                </span>
              ) : null}
              {!node.isGroup && node.isStationary && stationaryBadge ? (
                <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  {stationaryBadge}
                </span>
              ) : null}
            </div>
            {canMutate ? (
              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onEdit(node)}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-amber-500 dark:text-zinc-400"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(node.id)}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-red-500 dark:text-zinc-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {!isLoading && flat.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:text-zinc-400">
            {emptyLabel}
          </div>
        ) : null}
      </div>
    </>
  );
}

