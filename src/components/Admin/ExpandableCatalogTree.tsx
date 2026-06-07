"use client";

import { useMemo, useState } from "react";
import { Layers, Plus } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { BTN_PRIMARY_COMPACT_SM } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { getDictionary } from "@/i18n";
import { formatDict } from "@/i18n/format";
import { filterCatalogTree } from "@/lib/filterCatalogTree";
import {
  buildMaterialCategoryTree,
  computeCategoryBranchStats,
  indexMaterialsByCategory,
  type CatalogMaterialRow,
} from "@/lib/materialCatalogTree";
import type { CategoryHierarchyRow, CategoryTreeNode } from "@/lib/categoryTree";
import CatalogTreeNodeComponent from "./CatalogTreeNode";
import CatalogMaterialRowComponent from "./CatalogMaterialRow";

const EMPTY_CATALOG_MATERIALS: CatalogMaterialRow[] = [];

export type CatalogCategoryItem = CategoryHierarchyRow & {
  color?: string | null;
  isStationary?: boolean;
};

type Props<T extends CatalogCategoryItem> = {
  title: string;
  subtitle?: string;
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
  searchPlaceholder?: string;
  searchNoResults?: string;
  categories: T[];
  materials?: CatalogMaterialRow[];
  isLoading: boolean;
  canMutate: boolean;
  onAddCategory: () => void;
  onAddMaterial?: () => void;
  onPreviewCategory?: (item: T) => void;
  onEditCategory: (item: T) => void;
  onDeleteCategory: (id: number) => void;
  onPreviewMaterial?: (material: CatalogMaterialRow) => void;
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
  searchPlaceholder,
  searchNoResults,
  categories,
  materials,
  isLoading,
  canMutate,
  onAddCategory,
  onAddMaterial,
  onPreviewCategory,
  onEditCategory,
  onDeleteCategory,
  onPreviewMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: Props<T>) {
  const materialList = materials ?? EMPTY_CATALOG_MATERIALS;
  const roots = useMemo(() => buildMaterialCategoryTree(categories), [categories]);
  const materialIndex = useMemo(
    () => indexMaterialsByCategory(categories, materialList),
    [categories, materialList]
  );
  const branchStats = useMemo(
    () => computeCategoryBranchStats(roots, materialIndex.byCategoryId),
    [roots, materialIndex.byCategoryId]
  );
  const showMaterialStats = Boolean(treeStatMaterials);
  const catalogDict = getDictionary().admin.categories.shared;
  const resolvedSearchPlaceholder = searchPlaceholder ?? catalogDict.catalogSearchPlaceholder;
  const resolvedSearchNoResults = searchNoResults ?? catalogDict.catalogSearchNoResults;

  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(
    () => filterCatalogTree(roots, materialIndex, searchQuery),
    [roots, materialIndex, searchQuery]
  );

  const displayRoots = filtered.roots;
  const displayMaterialIndex = filtered.materialsByCategoryId;
  const displayUncategorized = filtered.uncategorized;

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      if (!prev.has(id)) {
        const next = new Set(prev);
        next.add(id);
        return next;
      }
      if (prev.size === 1) return new Set<number>();
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const hasContent =
    categories.length > 0 ||
    materialIndex.uncategorized.length > 0 ||
    (isLoading && categories.length === 0);

  const hasFilteredContent = displayRoots.length > 0 || displayUncategorized.length > 0;

  const isNodeExpanded = (id: number) =>
    filtered.hasQuery ? filtered.expandIds.has(id) : expanded.has(id);

  const renderCategoryNodes = (nodes: CategoryTreeNode<T>[]): React.ReactNode =>
    nodes.map((node) => {
      const childMaterials = displayMaterialIndex.get(node.id) ?? [];
      const isExpanded = isNodeExpanded(node.id);
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
        <CatalogTreeNodeComponent
          key={`cat-${node.id}`}
          node={node}
          childMaterials={childMaterials}
          isExpanded={isExpanded}
          categoryStatLong={categoryStatLong}
          categoryStatShort={categoryStatShort}
          materialStat={materialStat}
          materialCount={materialCount}
          groupBadge={groupBadge}
          stationaryBadge={stationaryBadge}
          materialBadge={materialBadge}
          canMutate={canMutate}
          onToggle={toggleExpanded}
          onPreviewCategory={onPreviewCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onPreviewMaterial={onPreviewMaterial}
          onEditMaterial={onEditMaterial}
          onDeleteMaterial={onDeleteMaterial}
          renderChildren={() => renderCategoryNodes(node.children)}
        />
      );
    });

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddCategory}
              className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT_SM)}
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

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={resolvedSearchPlaceholder}
      />

      <div className="mb-10 space-y-1">
        {renderCategoryNodes(displayRoots)}
        {displayUncategorized.length > 0 ? (
          <>
            {uncategorizedTitle ? (
              <p
                className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                style={{ marginLeft: 0 }}
              >
                {uncategorizedTitle}
              </p>
            ) : null}
            {displayUncategorized.map((m) => (
              <CatalogMaterialRowComponent
                key={`mat-${m.id}-0-`}
                material={m}
                depth={0}
                materialBadge={materialBadge}
                canMutate={canMutate}
                onPreview={onPreviewMaterial}
                onEdit={onEditMaterial}
                onDelete={onDeleteMaterial}
              />
            ))}
          </>
        ) : null}
        {!isLoading && hasContent && filtered.hasQuery && !hasFilteredContent ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:text-zinc-400">
            {resolvedSearchNoResults}
          </div>
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
