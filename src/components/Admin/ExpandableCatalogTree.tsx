"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, Edit2, Folder, Layers, Package, Plus, Trash2 } from "lucide-react";
import { formatDict } from "@/i18n/format";
import {
  buildMaterialCategoryTree,
  collectExpandableCategoryIds,
  computeCategoryBranchStats,
  indexMaterialsByCategory,
  type CatalogMaterialRow,
} from "@/lib/materialCatalogTree";
import type { CategoryHierarchyRow, CategoryTreeNode } from "@/lib/categoryTree";

export type CatalogCategoryItem = CategoryHierarchyRow & {
  color?: string | null;
  isStationary?: boolean;
};

type Props<T extends CatalogCategoryItem> = {
  title: string;
  subtitle: string;
  addCategoryLabel: string;
  addMaterialLabel?: string;
  emptyLabel: string;
  groupBadge: string;
  treeStatCategories?: string;
  treeStatCategoriesShort?: string;
  treeStatMaterials?: string;
  materialBadge?: string;
  uncategorizedTitle?: string;
  stationaryBadge?: string;
  categories: T[];
  materials?: CatalogMaterialRow[];
  isLoading: boolean;
  canMutate: boolean;
  onAddCategory: () => void;
  onAddMaterial?: () => void;
  onEditCategory: (item: T) => void;
  onDeleteCategory: (id: number) => void;
  onEditMaterial?: (material: CatalogMaterialRow) => void;
  onDeleteMaterial?: (id: number) => void;
};

export function ExpandableCatalogTree<T extends CatalogCategoryItem>({
  title,
  subtitle,
  addCategoryLabel,
  addMaterialLabel,
  emptyLabel,
  groupBadge,
  treeStatCategories,
  treeStatCategoriesShort,
  treeStatMaterials,
  materialBadge,
  uncategorizedTitle,
  stationaryBadge,
  categories,
  materials = [],
  isLoading,
  canMutate,
  onAddCategory,
  onAddMaterial,
  onEditCategory,
  onDeleteCategory,
  onEditMaterial,
  onDeleteMaterial,
}: Props<T>) {
  const roots = useMemo(() => buildMaterialCategoryTree(categories), [categories]);
  const materialIndex = useMemo(() => indexMaterialsByCategory(categories, materials), [categories, materials]);
  const branchStats = useMemo(
    () => computeCategoryBranchStats(roots, materialIndex.byCategoryId),
    [roots, materialIndex.byCategoryId],
  );
  const showMaterialStats = Boolean(treeStatMaterials);

  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const ids = collectExpandableCategoryIds(roots, materialIndex.byCategoryId);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, [roots, materialIndex.byCategoryId, categories]);

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasContent =
    categories.length > 0 || materialIndex.uncategorized.length > 0 || (isLoading && categories.length === 0);

  const renderMaterialRow = (material: CatalogMaterialRow, depth: number, categoryColor?: string | null) => (
    <div
      key={`mat-${material.id}-${depth}-${String(categoryColor)}`}
      className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
      style={{ marginLeft: `${depth * 1.25}rem` }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="w-5 shrink-0" />
        <div
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded shadow-sm"
          style={{ backgroundColor: categoryColor || "#78716c" }}
        >
          <Package className="h-2.5 w-2.5 text-white/90" />
        </div>
        <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">{material.name}</span>
        {materialBadge ? (
          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            {materialBadge}
          </span>
        ) : null}
      </div>
      {canMutate && onEditMaterial && onDeleteMaterial ? (
        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEditMaterial(material)}
            className="rounded-md p-1.5 text-zinc-600 transition hover:text-amber-500 dark:text-zinc-400"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteMaterial(material.id)}
            className="rounded-md p-1.5 text-zinc-600 transition hover:text-red-500 dark:text-zinc-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );

  const renderCategoryNodes = (nodes: CategoryTreeNode<T>[]) =>
    nodes.map((node) => {
      const childMaterials = materialIndex.byCategoryId.get(node.id) ?? [];
      const hasChildren = node.children.length > 0 || childMaterials.length > 0;
      const isExpanded = expanded.has(node.id);
      const stats = branchStats.get(node.id);
      const isBranch = node.isGroup || (node.children?.length ?? 0) > 0;
      const categoryCount = stats?.descendantCategoryCount ?? 0;
      const categoryStatLong =
        stats && treeStatCategories && isBranch && categoryCount > 0
          ? formatDict(treeStatCategories, { count: categoryCount })
          : null;
      const categoryStatShort =
        stats && treeStatCategoriesShort && isBranch && categoryCount > 0
          ? formatDict(treeStatCategoriesShort, { count: categoryCount })
          : null;
      const materialCount = stats
        ? isBranch
          ? stats.descendantMaterialCount
          : stats.directMaterialCount
        : 0;
      const materialStat =
        showMaterialStats && treeStatMaterials
          ? formatDict(treeStatMaterials, { count: materialCount })
          : null;

      return (
        <Fragment key={`cat-${node.id}`}>
          <div
            className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            style={{ marginLeft: `${node.depth * 1.25}rem` }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(node.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-expanded={isExpanded}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}
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
              ) : null}
              {!node.isGroup && node.isStationary && stationaryBadge ? (
                <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  {stationaryBadge}
                </span>
              ) : null}
            </div>
            {(categoryStatLong || categoryStatShort || materialStat) && (
              <div className="ml-auto flex shrink-0 items-center gap-2 px-1 text-[11px] tabular-nums leading-tight text-zinc-500 sm:gap-3 sm:text-xs">
                {categoryStatShort ? (
                  <span className="sm:hidden" title={categoryStatLong ?? categoryStatShort}>
                    {categoryStatShort}
                  </span>
                ) : null}
                {categoryStatLong ? (
                  <span className="hidden max-w-[9rem] truncate sm:inline" title={categoryStatLong}>
                    {categoryStatLong}
                  </span>
                ) : null}
                {materialStat ? (
                  <span
                    className={
                      materialCount > 0
                        ? "font-medium text-amber-800/90 dark:text-amber-300/90"
                        : "text-zinc-400 dark:text-zinc-500"
                    }
                  >
                    {materialStat}
                  </span>
                ) : null}
              </div>
            )}
            {canMutate ? (
              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onEditCategory(node)}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-amber-500 dark:text-zinc-400"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCategory(node.id)}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-red-500 dark:text-zinc-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
          {isExpanded ? (
            <>
              {renderCategoryNodes(node.children)}
              {!node.isGroup
                ? childMaterials.map((m) => renderMaterialRow(m, node.depth + 1, node.color))
                : null}
            </>
          ) : null}
        </Fragment>
      );
    });

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 pt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Layers className="h-5 w-5 text-amber-500" /> {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        {canMutate ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddCategory}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <Plus className="h-4 w-4" /> {addCategoryLabel}
            </button>
            {onAddMaterial && addMaterialLabel ? (
              <button
                type="button"
                onClick={onAddMaterial}
                className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-200"
              >
                <Plus className="h-4 w-4" /> {addMaterialLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-10 space-y-1">
        {renderCategoryNodes(roots)}
        {materialIndex.uncategorized.length > 0 ? (
          <>
            {uncategorizedTitle ? (
              <p
                className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                style={{ marginLeft: 0 }}
              >
                {uncategorizedTitle}
              </p>
            ) : null}
            {materialIndex.uncategorized.map((m) => renderMaterialRow(m, 0))}
          </>
        ) : null}
        {!isLoading && !hasContent ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:text-zinc-400">
            {emptyLabel}
          </div>
        ) : null}
      </div>
    </>
  );
}

